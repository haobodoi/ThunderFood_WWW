package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.edu.iuh.fit.thunderfood.dto.CartResponses.CartLine;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.*;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.OrderPaymentStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.PaymentMethodEnum;
import vn.edu.iuh.fit.thunderfood.enums.PaymentRecordStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.FieldValidationException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.CartRepository;
import vn.edu.iuh.fit.thunderfood.repository.OrderRepository;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;
import vn.edu.iuh.fit.thunderfood.util.VietQrUtil;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.format.DateTimeFormatter;
import java.util.*;
import static vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum.*;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.*;

/**
 * Luồng đơn: PENDING -> CONFIRMED -> PREPARING -> DELIVERING -> COMPLETED; PENDING -> CANCELLED (khách);
 * PENDING/CONFIRMED -> REJECTED (quán). Đơn VietQR chỉ rời PENDING khi quán xác nhận đã nhận tiền,
 * vì chuyển khoản thẳng vào tài khoản quán nên hệ thống không nhận được tín hiệu từ ngân hàng.
 */
@Service
@Transactional
public class OrderService {
    private static final String PARTNER_ROLE = "RESTAURANT_PARTNER", CUSTOMER_ROLE = "CUSTOMER";
    private static final String CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final int PAGE_SIZE = 10;
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    private static final Map<OrderStatusEnum, OrderStatusEnum> NEXT_STATUS = Map.of(CONFIRMED, PREPARING, PREPARING, DELIVERING, DELIVERING, COMPLETED);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrderRepository orders;
    private final RestaurantRepository restaurants;
    private final CartRepository cartRepository;
    private final CustomerRules rules;
    private final CartService carts;
    private final OrderEvents events;
    private final ApplicationEventPublisher publisher;
    public OrderService(OrderRepository orders, RestaurantRepository restaurants, CartRepository cartRepository, CustomerRules rules, CartService carts, OrderEvents events, ApplicationEventPublisher publisher) {
        this.orders = orders; this.restaurants = restaurants; this.cartRepository = cartRepository; this.rules = rules; this.carts = carts; this.events = events; this.publisher = publisher;
    }

    @Transactional(readOnly = true)
    public SseEmitter customerStream(long customer) { rules.actor(customer, CUSTOMER_ROLE, false); return events.subscribe(customer); }
    @Transactional(readOnly = true)
    public SseEmitter partnerStream(long partner) { rules.actor(partner, PARTNER_ROLE, false); return events.subscribe(partner); }

    @Transactional(readOnly = true)
    public CheckoutPreview preview(long customer, long cartId) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        var cart = carts.view(customer, cartId);
        var restaurant = restaurant(cart.restaurantId());
        BigDecimal subtotal = cart.subtotal();
        BigDecimal total = subtotal.add(restaurant.getDeliveryFee());
        var lines = cart.items().stream().map(line -> new CheckoutLine(line.cartItemId(), line.itemName(), line.quantity(), line.lineTotal(), line.note(), line.available())).toList();
        return new CheckoutPreview(cartId, cart.version(), restaurant.getRestaurantName(), lines, subtotal, restaurant.getDeliveryFee(), total, qrBin(restaurant, total).isPresent());
    }

    public CustomerOrder checkout(long customer, Checkout request) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        // Khóa giỏ và kiểm tra version để bấm đặt hai lần hoặc hai tab chỉ tạo được một đơn.
        var lockedCart = cartRepository.findWithLockByIdAndCustomerId(request.cartId(), customer)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giỏ hàng"));
        if (!lockedCart.getVersion().equals(request.version())) throw new ConcurrentUpdateException();
        PaymentMethodEnum method = request.paymentMethod();
        String name = InputNormalizerUtil.text(request.recipientName());
        String phone = InputNormalizerUtil.phone(request.recipientPhone());
        if (phone == null || !phone.matches("^0\\d{9}$"))
            throw new FieldValidationException("Dữ liệu chưa hợp lệ", Map.of("recipientPhone", "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0"));
        String address = InputNormalizerUtil.text(request.deliveryAddress());
        String note = text(request.note(), 0, 1000);

        var cart = carts.view(customer, request.cartId());
        var lines = cart.items().stream().filter(CartLine::available).toList();
        if (lines.isEmpty()) throw new BusinessException("Giỏ không có món nào đặt được lúc này");
        var restaurant = restaurant(cart.restaurantId());
        BigDecimal subtotal = cart.subtotal();
        BigDecimal total = subtotal.add(restaurant.getDeliveryFee());
        if (total.compareTo(request.expectedTotal()) != 0)
            throw new BusinessException("Giá món hoặc phí giao hàng vừa thay đổi. Vui lòng kiểm tra lại tổng tiền rồi đặt lại.");
        if (method == PaymentMethodEnum.ONLINE && qrBin(restaurant, total).isEmpty())
            throw new BusinessException("Quán chưa hỗ trợ thanh toán VietQR cho đơn này. Vui lòng chọn thanh toán khi nhận hàng.");

        var now = rules.now();
        String code = "TF-" + now.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + randomCode();
        var order = new OrderEntity(code, customer, restaurant, name, phone, address, note.isEmpty() ? null : note, method, subtotal, restaurant.getDeliveryFee(), total, now);
        for (var line : lines)
            order.addItem(line.itemId(), line.itemName(), line.unitPrice(), line.quantity(), line.lineTotal(), line.note().isEmpty() ? null : line.note());
        order.addPayment(method == PaymentMethodEnum.ONLINE ? "VIETQR" : "COD", transferContent(code), now);
        orders.save(order);
        lockedCart.removeItems(lines.stream().map(CartLine::cartItemId).toList(), now);
        // Ghi ngay để lỗi DB trả về trong request này, trước khi phát sự kiện.
        cartRepository.flush();
        changed(order, true);
        return CustomerOrder.from(order, qr(order));
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> mine(long customer, int page) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        return PageResponse.from(orders.findByCustomerId(customer, page(page)), OrderSummary::from);
    }

    @Transactional(readOnly = true)
    public CustomerOrder get(long customer, long id) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        var order = orders.findByIdAndCustomerId(id, customer).orElseThrow(OrderService::notFound);
        return CustomerOrder.from(order, qr(order));
    }

    public CustomerOrder cancel(long customer, long id, OrderReason request) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        var order = orders.findWithLockByIdAndCustomerId(id, customer).orElseThrow(OrderService::notFound);
        if (order.getOrderStatus() != PENDING || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID)
            throw new BusinessException("Đơn đã được quán tiếp nhận nên không thể tự hủy. Vui lòng liên hệ quán.");
        close(order, CANCELLED, text(request.reason(), 5, 500));
        changed(order, false);
        return CustomerOrder.from(order, qr(order));
    }

    @Transactional(readOnly = true)
    public PageResponse<PartnerOrder> partnerOrders(long partner, OrderStatusEnum status, int page) {
        rules.actor(partner, PARTNER_ROLE, false);
        var result = status == null ? orders.findByRestaurantOwnerUserId(partner, page(page)) : orders.findByRestaurantOwnerUserIdAndOrderStatus(partner, status, page(page));
        return PageResponse.from(result, PartnerOrder::from);
    }

    public void updateStatus(long partner, long id, OrderStatus request) {
        rules.actor(partner, PARTNER_ROLE, true);
        var order = ownedOrder(partner, id);
        OrderStatusEnum current = order.getOrderStatus(), target = request.status();
        var now = rules.now();
        if (target == REJECTED) {
            if (current != PENDING && current != CONFIRMED) throw new BusinessException("Chỉ từ chối được đơn chưa bắt đầu chế biến");
            close(order, REJECTED, text(request.reason(), 5, 500));
        } else if (target == CONFIRMED) {
            if (current != PENDING) throw new BusinessException("Đơn không còn ở trạng thái chờ xác nhận");
            if (order.getPaymentMethod() == PaymentMethodEnum.ONLINE) throw new BusinessException("Đơn VietQR cần xác nhận đã nhận tiền trước");
            order.moveTo(CONFIRMED, now);
        } else {
            if (target != NEXT_STATUS.get(current)) throw new BusinessException("Không thể chuyển đơn sang trạng thái này");
            order.moveTo(target, now);
            // Đơn COD thu tiền lúc giao; đơn VietQR đã PAID trước khi rời PENDING.
            if (target == COMPLETED && order.getPaymentMethod() == PaymentMethodEnum.COD)
                order.settle(OrderPaymentStatusEnum.PAID, PaymentRecordStatusEnum.SUCCESS, "COD", now);
        }
        changed(order, false);
    }

    public void confirmPayment(long partner, long id) {
        rules.actor(partner, PARTNER_ROLE, true);
        var order = ownedOrder(partner, id);
        if (order.getPaymentMethod() != PaymentMethodEnum.ONLINE || order.getOrderStatus() != PENDING || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID)
            throw new BusinessException("Đơn này không ở trạng thái chờ xác nhận thanh toán");
        var now = rules.now();
        order.settle(OrderPaymentStatusEnum.PAID, PaymentRecordStatusEnum.SUCCESS, "MANUAL", now);
        order.moveTo(CONFIRMED, now);
        changed(order, false);
    }

    public void refund(long partner, long id) {
        rules.actor(partner, PARTNER_ROLE, true);
        var order = ownedOrder(partner, id);
        if (order.getOrderStatus() != REJECTED || order.getPaymentStatus() != OrderPaymentStatusEnum.PAID)
            throw new BusinessException("Chỉ hoàn tiền được đơn đã thanh toán và bị từ chối");
        order.settle(OrderPaymentStatusEnum.REFUNDED, PaymentRecordStatusEnum.REFUNDED, "MANUAL", rules.now());
        changed(order, false);
    }

    private void changed(OrderEntity order, boolean created) {
        publisher.publishEvent(new OrderEvents.OrderChanged(order.getId(), order.getCustomerId(), order.getRestaurant().getOwnerUserId(), created));
    }
    /** Đơn đã nhận tiền giữ nguyên PAID để quán còn phải hoàn tiền, không ghi nhận là thanh toán thất bại. */
    private void close(OrderEntity order, OrderStatusEnum status, String reason) {
        var now = rules.now();
        order.close(status, reason, now);
        if (order.getPaymentStatus() == OrderPaymentStatusEnum.UNPAID)
            order.settle(OrderPaymentStatusEnum.FAILED, PaymentRecordStatusEnum.FAILED, status.name(), now);
    }
    private OrderEntity ownedOrder(long partner, long id) {
        return orders.findWithLockByIdAndRestaurantOwnerUserId(id, partner).orElseThrow(OrderService::notFound);
    }
    private RestaurantEntity restaurant(long id) {
        return restaurants.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán"));
    }
    private static ResourceNotFoundException notFound() { return new ResourceNotFoundException("Không tìm thấy đơn hàng"); }
    /** Mã QR chỉ tồn tại khi khách còn phải trả tiền; quán đổi sang tài khoản không hỗ trợ thì không có mã, đơn vẫn xem được. */
    private static PaymentQr qr(OrderEntity order) {
        if (order.getPaymentMethod() != PaymentMethodEnum.ONLINE || order.getOrderStatus() != PENDING || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID) return null;
        var restaurant = order.getRestaurant();
        var bin = qrBin(restaurant, order.getTotalAmount());
        if (bin.isEmpty()) return null;
        String account = restaurant.getBankAccountNumber(), content = transferContent(order.getOrderCode());
        return new PaymentQr(VietQrUtil.payload(bin.get(), account, order.getTotalAmount(), content), restaurant.getBankName(), account, restaurant.getBankAccountHolder(), order.getTotalAmount(), content);
    }
    private static Optional<String> qrBin(RestaurantEntity restaurant, BigDecimal amount) {
        String account = restaurant.getBankAccountNumber();
        if (account == null || !account.matches("\\d{6,19}") || !VietQrUtil.isPayableAmount(amount)) return Optional.empty();
        return VietQrUtil.binOf(restaurant.getBankName());
    }
    /** Ứng dụng ngân hàng có thể bỏ ký tự đặc biệt, nên nội dung chỉ giữ chữ và số để quán còn đối soát được. */
    private static String transferContent(String orderCode) { return orderCode.replace("-", ""); }
    private static String randomCode() {
        var code = new StringBuilder();
        for (int i = 0; i < 6; i++) code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        return code.toString();
    }
    private static Pageable page(int page) {
        if (page < 0 || page > 10000) throw new BusinessException("Trang không hợp lệ");
        return PageRequest.of(page, PAGE_SIZE, NEWEST_FIRST);
    }
}
