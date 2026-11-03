package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.CartResponses.CartResponse;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.entity.CartEntity;
import vn.edu.iuh.fit.thunderfood.entity.CartItemEntity;
import vn.edu.iuh.fit.thunderfood.entity.MenuItemEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.ApprovalStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.CartRepository;
import vn.edu.iuh.fit.thunderfood.repository.MenuItemRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.*;

/**
 * Mọi thao tác ghi khóa dòng user của khách trước (rules.actor), nên các ghi của một khách chạy tuần tự:
 * đọc thường giỏ và dòng món sau khóa đó luôn thấy bản mới nhất. Món và quán đọc bằng FOR UPDATE để giá,
 * tình trạng dùng cho kiểm tra là giá trị thật; không nạp chúng trước khóa vì Hibernate sẽ không đọc lại entity đã có.
 */
@Service
@Transactional
public class CartService {
    private static final String CUSTOMER_ROLE = "CUSTOMER";
    private static final int MAX_DISH_QUANTITY = 99, MAX_LINES = 50, MAX_NOTE_LENGTH = 300;

    private final CartRepository carts;
    private final MenuItemRepository menuItems;
    private final CustomerRules rules;
    public CartService(CartRepository carts, MenuItemRepository menuItems, CustomerRules rules) { this.carts = carts; this.menuItems = menuItems; this.rules = rules; }

    @Transactional(readOnly = true)
    public List<CartResponse> list(long customer) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        var found = carts.findDetailedByCustomerIdOrderByUpdatedAtDescIdDesc(customer);
        var open = rules.openRestaurants(found.stream().map(CartEntity::getRestaurant).toList());
        return found.stream().map(cart -> response(cart, open)).toList();
    }
    @Transactional(readOnly = true)
    public CartResponse get(long customer, long cart) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        return view(customer, cart);
    }

    public CartResponse add(long customer, AddItem request) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        long restaurantId = menuItems.findRestaurantIdById(request.itemId()).orElseThrow(CartService::notFound);
        var cart = carts.findIdByCustomerIdAndRestaurantId(customer, restaurantId).map(id -> lockedCart(customer, id)).orElse(null);
        version(cart == null ? 0 : cart.getVersion(), request.version());
        var dish = lockedItem(request.itemId());
        requireAvailable(dish);
        String note = text(request.note(), 0, MAX_NOTE_LENGTH);
        List<CartItemEntity> lines = cart == null ? List.of() : cart.getItems();
        quantityLimit(lines, request.itemId(), request.quantity(), null);
        var existing = sameNote(lines, request.itemId(), note, null);
        if (existing.isEmpty() && lines.size() >= MAX_LINES) throw new BusinessException("Một giỏ tối đa 50 dòng món");
        var now = rules.now();
        // Tạo giỏ sau khi đã khóa quán: khóa dùng chung do khóa ngoại của INSERT rồi mới xin FOR UPDATE sẽ deadlock với khách khác cùng quán.
        if (cart == null) cart = carts.save(new CartEntity(customer, dish.getRestaurant(), now));
        if (existing.isPresent()) existing.get().merge(request.quantity(), dish.getPrice());
        else cart.addItem(dish, request.quantity(), note);
        cart.touch(now);
        carts.flush();
        return view(customer, cart.getId());
    }

    public CartResponse change(long customer, long cartId, long lineId, ChangeItem request) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        var cart = lockedCart(customer, cartId);
        version(cart.getVersion(), request.version());
        var line = line(cart, lineId);
        var dish = lockedItem(line.getItemId());
        if (request.quantity() > line.getQuantity()) requireAvailable(dish);
        String note = text(request.note(), 0, MAX_NOTE_LENGTH);
        quantityLimit(cart.getItems(), line.getItemId(), request.quantity(), lineId);
        var duplicate = sameNote(cart.getItems(), line.getItemId(), note, lineId);
        if (duplicate.isPresent()) {
            cart.getItems().remove(line);
            // Hibernate mặc định ghi UPDATE trước DELETE; xóa dòng cũ trước để giữ đúng thứ tự với UNIQUE (cart_id, item_id, note).
            carts.flush();
            duplicate.get().merge(request.quantity(), dish.getPrice());
        } else line.change(request.quantity(), note, dish.getPrice());
        cart.touch(rules.now());
        carts.flush();
        return view(customer, cartId);
    }

    public CartResponse remove(long customer, long cartId, Long lineId, long expected) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        var cart = lockedCart(customer, cartId);
        version(cart.getVersion(), expected);
        var removed = lineId == null ? cart.getItems().stream().map(CartItemEntity::getId).toList() : List.of(line(cart, lineId).getId());
        cart.removeItems(removed, rules.now());
        carts.flush();
        return view(customer, cartId);
    }

    public CartResponse view(long customer, long id) {
        var cart = carts.findDetailedByIdAndCustomerId(id, customer).orElseThrow(CartService::notFound);
        return response(cart, rules.openRestaurants(List.of(cart.getRestaurant())));
    }

    private CartEntity lockedCart(long customer, long id) {
        return carts.findWithLockByIdAndCustomerId(id, customer).orElseThrow(CartService::notFound);
    }
    private MenuItemEntity lockedItem(long id) {
        return menuItems.findWithLockById(id).orElseThrow(CartService::notFound);
    }
    private CartResponse response(CartEntity cart, Set<Long> open) {
        boolean restaurantOpen = open.contains(cart.getRestaurantId());
        return CartResponse.from(cart, line -> unavailable(line.getItem(), cart.getRestaurant(), restaurantOpen));
    }
    private static CartItemEntity line(CartEntity cart, long lineId) {
        return cart.getItems().stream().filter(line -> line.getId() == lineId).findFirst().orElseThrow(CartService::notFound);
    }
    private static String unavailable(MenuItemEntity item, RestaurantEntity restaurant, boolean open) {
        if (restaurant.getStatus() != RestaurantStatusEnum.APPROVED) return "Quán hiện không hoạt động";
        if (item.getDeleted() || item.getApprovalStatus() != ApprovalStatusEnum.APPROVED) return "Món không còn phục vụ";
        if (!item.getAvailable()) return "Món tạm hết hàng";
        if (!open) return "Quán đang đóng cửa";
        return "";
    }
    private void requireAvailable(MenuItemEntity item) {
        var restaurant = item.getRestaurant();
        String reason = unavailable(item, restaurant, rules.open(restaurant.getId(), restaurant.getOpen()));
        if (!reason.isEmpty()) throw new BusinessException(reason);
    }
    private static void quantityLimit(List<CartItemEntity> lines, long itemId, int target, Long excludedLine) {
        int others = lines.stream().filter(line -> line.getItemId() == itemId && !line.getId().equals(excludedLine)).mapToInt(CartItemEntity::getQuantity).sum();
        if (target + others > MAX_DISH_QUANTITY) throw new BusinessException("Mỗi món tối đa 99 phần trong một giỏ, tính cả các ghi chú khác nhau");
    }
    /** So sánh chính xác từng ký tự, khớp collation utf8mb4_bin của cột note; note đã qua text() nên không có khoảng trắng cuối. */
    private static Optional<CartItemEntity> sameNote(List<CartItemEntity> lines, long itemId, String note, Long excludedLine) {
        return lines.stream().filter(line -> line.getItemId() == itemId && line.getNote().equals(note) && !line.getId().equals(excludedLine)).findFirst();
    }
    private static ResourceNotFoundException notFound() { return new ResourceNotFoundException("Không tìm thấy dữ liệu"); }
}
