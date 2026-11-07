package vn.edu.iuh.fit.thunderfood.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import vn.edu.iuh.fit.thunderfood.dto.CartResponses.CartResponse;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.AddItem;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantPublicDto;
import vn.edu.iuh.fit.thunderfood.entity.MenuItemEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.entity.UserEntity;
import vn.edu.iuh.fit.thunderfood.enums.ApprovalStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.AssistantQueryRepository;
import vn.edu.iuh.fit.thunderfood.repository.MenuItemRepository;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Các hàm Java mà model được phép gọi (tool calling). Model không chạm DB hay API: mọi thao tác đi qua service sẵn có,
 * nên giá, tồn kho, quyền và giới hạn giỏ vẫn do server kiểm tra. Id khách luôn lấy từ toolContext do server đặt,
 * không bao giờ nhận từ model. Quán và món tìm được cũng được gom vào toolContext để giao diện hiện thành thẻ bấm được,
 * nên model không cần (và không được) tự viết đường dẫn.
 */
@Component
public class AssistantTools {
    public static final String CUSTOMER_ID = "customerId";
    public static final String COLLECTED = "collected";
    private static final Logger log = LoggerFactory.getLogger(AssistantTools.class);
    private static final int MAX_RESULTS = 8, MAX_MENU_ITEMS = 40, MAX_RESTAURANT_CARDS = 6, MAX_DISH_CARDS = 8;
    private static final List<OrderStatusEnum> NOT_COUNTED = List.of(OrderStatusEnum.CANCELLED, OrderStatusEnum.REJECTED);

    private final PublicRestaurantService restaurants;
    private final AssistantQueryRepository queries;
    private final MenuItemRepository menuItems;
    private final RestaurantRepository restaurantRepository;
    private final CartService carts;
    private final OrderService orders;
    private final CustomerRules rules;
    private final UserRepository users;

    public AssistantTools(PublicRestaurantService restaurants, AssistantQueryRepository queries, MenuItemRepository menuItems,
                          RestaurantRepository restaurantRepository, CartService carts, OrderService orders,
                          CustomerRules rules, UserRepository users) {
        this.restaurants = restaurants;
        this.queries = queries;
        this.menuItems = menuItems;
        this.restaurantRepository = restaurantRepository;
        this.carts = carts;
        this.orders = orders;
        this.rules = rules;
        this.users = users;
    }

    /** Thẻ hiển thị trên giao diện chat. */
    public record RestaurantCard(long restaurantId, String name, String specialty, String address, String image,
                                 boolean openNow, BigDecimal deliveryFee) {}
    public record DishCard(long itemId, String name, BigDecimal price, String image, long restaurantId,
                           String restaurantName, boolean restaurantOpenNow) {}

    /** Gom kết quả của một lượt hỏi; được đặt vào toolContext cho từng request nên không dùng chung giữa các khách. */
    public static final class Collected {
        private final Map<Long, RestaurantCard> restaurants = Collections.synchronizedMap(new LinkedHashMap<>());
        private final Map<Long, DishCard> dishes = Collections.synchronizedMap(new LinkedHashMap<>());
        private final AtomicBoolean cartChanged = new AtomicBoolean(false);
        private final AtomicBoolean toolUsed = new AtomicBoolean(false);

        public List<RestaurantCard> restaurants() { synchronized (restaurants) { return restaurants.values().stream().limit(MAX_RESTAURANT_CARDS).toList(); } }
        public List<DishCard> dishes() { synchronized (dishes) { return dishes.values().stream().limit(MAX_DISH_CARDS).toList(); } }
        public boolean cartChanged() { return cartChanged.get(); }
        public boolean toolUsed() { return toolUsed.get(); }
    }

    // Dữ liệu trả cho model: chỉ có id và thông tin cần để trả lời, không có đường dẫn.
    public record MenuLine(long itemId, String name, String category, BigDecimal price, boolean available) {}
    public record MenuResult(RestaurantCard restaurant, List<MenuLine> items) {}
    public record PopularDish(long itemId, String name, BigDecimal price, long restaurantId, String restaurantName,
                              boolean restaurantOpenNow, long portionsOrdered) {}
    public record PopularResult(String period, List<PopularDish> dishes) {}
    public record CartLineInfo(String name, int quantity, BigDecimal lineTotal, boolean available) {}
    public record CartInfo(long cartId, long restaurantId, String restaurantName, List<CartLineInfo> items, BigDecimal subtotal) {}
    public record OrderInfo(String orderCode, String restaurantName, String status, BigDecimal total, String createdAt) {}

    @Tool(description = "Tìm quán ăn trên ThunderFood theo từ khóa (tên quán, ví dụ 'Cơm Tấm Sườn Nướng Than Hoa', hoặc món đặc trưng "
            + "như 'cơm', 'phở', 'trà sữa') và/hoặc khu vực (tỉnh/thành, phường, tên đường, tên khu vực). Quán đang mở được xếp trước.")
    public Object searchRestaurants(
            @ToolParam(description = "Từ khóa tên quán hoặc món đặc trưng", required = false) String keyword,
            @ToolParam(description = "Khu vực: tỉnh/thành, phường, tên đường hoặc tên khu vực", required = false) String area,
            ToolContext context) {
        return safe(context, () -> {
            String wanted = normalize(area);
            var found = restaurants.search(keyword, null).stream()
                    .filter(r -> wanted.isEmpty() || matchesArea(r, wanted))
                    .sorted(Comparator.comparing((RestaurantPublicDto r) -> !Boolean.TRUE.equals(r.open())))
                    .limit(MAX_RESULTS)
                    .map(AssistantTools::restaurantCard)
                    .toList();
            found.forEach(c -> collected(context).ifPresent(col -> col.restaurants.putIfAbsent(c.restaurantId(), c)));
            return found.isEmpty() ? Map.of("message", "Không tìm thấy quán phù hợp") : found;
        });
    }

    @Tool(description = "Tìm món ăn đang bán trên toàn ThunderFood theo tên/mô tả món và giá tối đa mỗi món (VND). "
            + "Kết quả có itemId để thêm vào giỏ, và quán bán món đó.")
    public Object searchDishes(
            @ToolParam(description = "Từ khóa món, ví dụ 'cơm tấm', 'bún bò', 'trà sữa'", required = false) String keyword,
            @ToolParam(description = "Giá tối đa mỗi món, đơn vị VND, ví dụ 50000", required = false) Integer maxPrice,
            ToolContext context) {
        return safe(context, () -> {
            String kw = keyword == null || keyword.isBlank() ? null : keyword.trim();
            BigDecimal max = maxPrice == null || maxPrice <= 0 ? null : BigDecimal.valueOf(maxPrice);
            List<MenuItemEntity> found = queries.searchDishes(ApprovalStatusEnum.APPROVED, RestaurantStatusEnum.APPROVED,
                    kw, max, PageRequest.of(0, 40));
            Set<Long> open = rules.openRestaurants(found.stream().map(MenuItemEntity::getRestaurant).distinct().toList());
            var dishes = found.stream()
                    .sorted(Comparator.comparing((MenuItemEntity m) -> !open.contains(m.getRestaurantId())))
                    .limit(MAX_RESULTS)
                    .map(m -> new DishCard(m.getId(), m.getItemName(), m.getPrice(), m.getImageUrl(), m.getRestaurantId(),
                            m.getRestaurant().getRestaurantName(), open.contains(m.getRestaurantId())))
                    .toList();
            dishes.forEach(d -> collected(context).ifPresent(col -> col.dishes.putIfAbsent(d.itemId(), d)));
            return dishes.isEmpty() ? Map.of("message", "Không tìm thấy món phù hợp") : dishes;
        });
    }

    @Tool(description = "Xem thực đơn của một quán: danh sách món, giá, còn bán hay tạm hết, kèm itemId.")
    public Object getRestaurantMenu(
            @ToolParam(description = "restaurantId lấy từ kết quả tìm quán hoặc tìm món") Long restaurantId,
            ToolContext context) {
        return safe(context, () -> {
            if (restaurantId == null) throw new BusinessException("Thiếu restaurantId");
            var menu = restaurants.getMenu(restaurantId);
            var restaurant = restaurantCard(menu.restaurant());
            var items = menu.menu().stream()
                    .flatMap(c -> c.items().stream().map(i -> new MenuLine(i.id(), i.itemName(), c.categoryName(), i.price(),
                            Boolean.TRUE.equals(i.available()))))
                    .limit(MAX_MENU_ITEMS)
                    .toList();
            collected(context).ifPresent(col -> {
                col.restaurants.putIfAbsent(restaurant.restaurantId(), restaurant);
                menu.menu().stream().flatMap(c -> c.items().stream())
                        .filter(i -> Boolean.TRUE.equals(i.available()))
                        .limit(MAX_DISH_CARDS)
                        .forEach(i -> col.dishes.putIfAbsent(i.id(), new DishCard(i.id(), i.itemName(), i.price(), i.imageUrl(),
                                restaurant.restaurantId(), restaurant.name(), restaurant.openNow())));
            });
            return new MenuResult(restaurant, items);
        });
    }

    @Tool(description = "Các món được đặt nhiều nhất hôm nay trên ThunderFood (nếu hôm nay chưa có đơn thì lấy 7 ngày gần nhất).")
    public Object popularDishes(ToolContext context) {
        return safe(context, () -> {
            LocalDateTime today = rules.now().toLocalDate().atStartOfDay();
            String period = "hôm nay";
            var rows = queries.popularDishes(today, NOT_COUNTED, PageRequest.of(0, MAX_RESULTS));
            if (rows.isEmpty()) {
                period = "7 ngày gần nhất";
                rows = queries.popularDishes(today.minusDays(6), NOT_COUNTED, PageRequest.of(0, MAX_RESULTS));
            }
            List<Long> itemIds = rows.stream().map(r -> ((Number) r[0]).longValue()).toList();
            List<Long> restaurantIds = rows.stream().map(r -> ((Number) r[2]).longValue()).distinct().toList();
            Map<Long, MenuItemEntity> items = menuItems.findAllById(itemIds).stream()
                    .collect(Collectors.toMap(MenuItemEntity::getId, Function.identity()));
            Set<Long> open = rules.openRestaurants(restaurantRepository.findAllById(restaurantIds));

            List<PopularDish> dishes = new ArrayList<>();
            for (Object[] r : rows) {
                long itemId = ((Number) r[0]).longValue(), restaurantId = ((Number) r[2]).longValue();
                MenuItemEntity item = items.get(itemId);
                // Món đã xóa hoặc tạm hết thì không gợi ý.
                if (item == null || Boolean.TRUE.equals(item.getDeleted()) || !Boolean.TRUE.equals(item.getAvailable())) continue;
                boolean isOpen = open.contains(restaurantId);
                dishes.add(new PopularDish(itemId, (String) r[1], item.getPrice(), restaurantId, (String) r[3], isOpen,
                        ((Number) r[4]).longValue()));
                collected(context).ifPresent(col -> col.dishes.putIfAbsent(itemId, new DishCard(itemId, (String) r[1],
                        item.getPrice(), item.getImageUrl(), restaurantId, (String) r[3], isOpen)));
            }
            return new PopularResult(period, dishes);
        });
    }

    @Tool(description = "Lấy địa chỉ giao hàng đã lưu của khách đang chat, dùng khi khách hỏi quán hoặc món 'gần đây', 'gần tôi'.")
    public Object getMyDeliveryAddress(ToolContext context) {
        return safe(context, () -> users.findById(customer(context))
                .map(UserEntity::getAddress)
                .filter(a -> a != null && !a.isBlank())
                .<Object>map(a -> Map.of("address", a))
                .orElse(Map.of("message", "Khách chưa lưu địa chỉ, hãy hỏi khách đang ở khu vực nào.")));
    }

    @Tool(description = "Xem giỏ hàng hiện tại của khách đang chat (mỗi quán một giỏ).")
    public Object viewCart(ToolContext context) {
        return safe(context, () -> {
            var list = carts.list(customer(context)).stream().map(AssistantTools::cartInfo).toList();
            return list.isEmpty() ? Map.of("message", "Giỏ hàng đang trống") : list;
        });
    }

    @Tool(description = "Thêm một món vào giỏ hàng của khách. CHỈ gọi sau khi khách đã xác nhận rõ ràng món và số lượng. "
            + "Hàm này không đặt hàng và không thanh toán.")
    public Object addToCart(
            @ToolParam(description = "itemId của món, lấy từ kết quả tìm món, thực đơn hoặc món được đặt nhiều") Long itemId,
            @ToolParam(description = "Số lượng, từ 1 đến 99") Integer quantity,
            @ToolParam(description = "Ghi chú cho quán, ví dụ 'ít cay'", required = false) String note,
            ToolContext context) {
        return safe(context, () -> {
            long customer = customer(context);
            int qty = quantity == null ? 1 : quantity;
            if (itemId == null) throw new BusinessException("Thiếu itemId của món");
            if (qty < 1 || qty > 99) throw new BusinessException("Số lượng phải từ 1 đến 99");
            long restaurantId = menuItems.findRestaurantIdById(itemId)
                    .orElseThrow(() -> new BusinessException("Không tìm thấy món này"));
            // Giỏ dùng khóa lạc quan: lấy version hiện tại của giỏ cùng quán (0 nếu chưa có giỏ).
            long version = carts.list(customer).stream()
                    .filter(c -> c.restaurantId() == restaurantId)
                    .findFirst().map(CartResponse::version).orElse(0L);
            String cleanNote = note == null || note.isBlank() ? null : note.trim();
            var cart = carts.add(customer, new AddItem(itemId, qty, cleanNote, version));
            collected(context).ifPresent(col -> col.cartChanged.set(true));
            return cartInfo(cart);
        });
    }

    @Tool(description = "Xem tối đa 5 đơn hàng gần nhất của khách đang chat và trạng thái của chúng.")
    public Object myRecentOrders(ToolContext context) {
        return safe(context, () -> {
            var list = orders.mine(customer(context), 0).items().stream().limit(5)
                    .map(o -> new OrderInfo(o.orderCode(), o.restaurantName(), o.orderStatus(), o.totalAmount(),
                            String.valueOf(o.createdAt())))
                    .toList();
            return list.isEmpty() ? Map.of("message", "Khách chưa có đơn hàng nào") : list;
        });
    }

    private static long customer(ToolContext context) {
        Object id = context == null ? null : context.getContext().get(CUSTOMER_ID);
        if (id instanceof Number n) return n.longValue();
        throw new IllegalStateException("Thiếu thông tin khách trong toolContext");
    }

    private static Optional<Collected> collected(ToolContext context) {
        return context != null && context.getContext().get(COLLECTED) instanceof Collected c ? Optional.of(c) : Optional.empty();
    }

    private static RestaurantCard restaurantCard(RestaurantPublicDto r) {
        String image = r.avatarImage() != null && !r.avatarImage().isBlank() ? r.avatarImage() : r.coverImage();
        return new RestaurantCard(r.id(), r.restaurantName(), r.specialty(), r.address(), image,
                Boolean.TRUE.equals(r.open()), r.deliveryFee());
    }

    private static CartInfo cartInfo(CartResponse c) {
        var lines = c.items().stream().map(l -> new CartLineInfo(l.itemName(), l.quantity(), l.lineTotal(), l.available())).toList();
        return new CartInfo(c.cartId(), c.restaurantId(), c.restaurantName(), lines, c.subtotal());
    }

    private static boolean matchesArea(RestaurantPublicDto r, String wanted) {
        return Stream.of(r.province(), r.ward(), r.areaName(), r.address(), r.streetAddress())
                .filter(Objects::nonNull)
                .map(AssistantTools::normalize)
                .anyMatch(v -> v.contains(wanted));
    }

    /** So khớp khu vực không phân biệt hoa thường và dấu tiếng Việt. */
    private static String normalize(String value) {
        if (value == null) return "";
        String noMarks = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noMarks.replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT).trim();
    }

    /** Lỗi nghiệp vụ trả về cho model dưới dạng thông báo để nó giải thích cho khách, thay vì làm hỏng cả câu trả lời. */
    private Object safe(ToolContext context, Supplier<Object> action) {
        collected(context).ifPresent(col -> col.toolUsed.set(true));
        try {
            return action.get();
        } catch (BusinessException | ResourceNotFoundException | ConcurrentUpdateException e) {
            return Map.of("error", e.getMessage() == null ? "Không thực hiện được thao tác" : e.getMessage());
        } catch (RuntimeException e) {
            log.warn("Công cụ trợ lý lỗi", e);
            return Map.of("error", "Không thực hiện được thao tác, vui lòng thử lại.");
        }
    }
}
