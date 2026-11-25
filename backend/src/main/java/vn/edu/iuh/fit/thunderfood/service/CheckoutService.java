package vn.edu.iuh.fit.thunderfood.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.CartResponses.CartLine;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.Checkout;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.ExpectedCheckoutLine;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.CheckoutLine;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.CheckoutPreview;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.CustomerOrder;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.PaymentMethodEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.FieldValidationException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.CartRepository;
import vn.edu.iuh.fit.thunderfood.repository.OrderRepository;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;
import vn.edu.iuh.fit.thunderfood.repository.SepayPaymentRepository.Recipient;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;
import vn.edu.iuh.fit.thunderfood.util.OrderCodeUtil;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.text;

@Service
@Transactional
public class CheckoutService {
    private static final String CUSTOMER_ROLE = "CUSTOMER";

    private final OrderRepository orders;
    private final RestaurantRepository restaurants;
    private final CartRepository cartRepository;
    private final CustomerRules rules;
    private final CartService carts;
    private final OrderPaymentService payments;
    private final ApplicationEventPublisher publisher;
    private final ObjectMapper json;

    public CheckoutService(OrderRepository orders, RestaurantRepository restaurants, CartRepository cartRepository,
                           CustomerRules rules, CartService carts, OrderPaymentService payments,
                           ApplicationEventPublisher publisher, ObjectMapper json) {
        this.orders = orders;
        this.restaurants = restaurants;
        this.cartRepository = cartRepository;
        this.rules = rules;
        this.carts = carts;
        this.payments = payments;
        this.publisher = publisher;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public CheckoutPreview preview(long customer, long cartId) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        var cart = carts.view(customer, cartId);
        var restaurant = restaurant(cart.restaurantId());
        BigDecimal subtotal = cart.subtotal();
        BigDecimal total = subtotal.add(restaurant.getDeliveryFee());
        var lines = cart.items().stream()
                .map(line -> new CheckoutLine(line.cartItemId(), line.itemName(), line.quantity(),
                        line.lineTotal(), line.note(), line.available()))
                .toList();
        return new CheckoutPreview(cartId, cart.version(), restaurant.getRestaurantName(), lines, subtotal,
                restaurant.getDeliveryFee(), total, payments.recipient(restaurant, total).isPresent());
    }

    public CustomerOrder checkout(long customer, UUID requestId, Checkout request) {
        // Khóa khách trước khi tra mã để hai yêu cầu cùng lúc nhìn thấy cùng kết quả sau commit.
        rules.actor(customer, CUSTOMER_ROLE, true);
        String requestHash = requestId == null ? null : fingerprint(request);
        if (requestId != null) {
            var previous = orders.findByCustomerIdAndCheckoutRequestId(customer, requestId.toString());
            if (previous.isPresent()) {
                var order = previous.get();
                if (!order.matchesCheckoutRequest(requestHash)) throw new ConcurrentUpdateException();
                return CustomerOrder.from(order, payments.qr(order));
            }
        }
        // Khóa giỏ và kiểm tra version để bấm đặt hai lần hoặc hai tab chỉ tạo được một đơn.
        var lockedCart = cartRepository.findWithLockByIdAndCustomerId(request.cartId(), customer)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giỏ hàng"));
        if (!lockedCart.getVersion().equals(request.version())) throw new ConcurrentUpdateException();
        PaymentMethodEnum method = request.paymentMethod();
        String name = InputNormalizerUtil.text(request.recipientName());
        String phone = InputNormalizerUtil.phone(request.recipientPhone());
        if (phone == null || !phone.matches("^0\\d{9}$"))
            throw new FieldValidationException("Dữ liệu chưa hợp lệ",
                    Map.of("recipientPhone", "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0"));
        String address = InputNormalizerUtil.text(request.deliveryAddress());
        String note = text(request.note(), 0, 1000);

        var cart = carts.view(customer, request.cartId());
        var lines = cart.items().stream().filter(CartLine::available).toList();
        if (lines.isEmpty()) throw new BusinessException("Giỏ không có món nào đặt được lúc này");
        var restaurant = restaurant(cart.restaurantId());
        BigDecimal subtotal = cart.subtotal();
        BigDecimal total = subtotal.add(restaurant.getDeliveryFee());
        if (total.compareTo(request.expectedTotal()) != 0 || !matchesPreview(lines, request.expectedLines()))
            throw new BusinessException(
                    "Món khả dụng, giá món hoặc phí giao hàng vừa thay đổi. Vui lòng kiểm tra lại đơn rồi đặt lại.");
        Recipient recipient = method == PaymentMethodEnum.ONLINE ? payments.recipient(restaurant, total).orElse(null) : null;
        if (method == PaymentMethodEnum.ONLINE && recipient == null)
            throw new BusinessException(
                    "Quán chưa hỗ trợ thanh toán VietQR cho đơn này. Vui lòng chọn thanh toán khi nhận hàng.");
        var now = rules.now();
        String code = OrderCodeUtil.generate(now.toLocalDate());
        var order = new OrderEntity(code, customer, restaurant, name, phone, address,
                note.isEmpty() ? null : note, method, subtotal, restaurant.getDeliveryFee(), total, now);
        for (var line : lines)
            order.addItem(line.itemId(), line.itemName(), line.unitPrice(), line.quantity(), line.lineTotal(),
                    line.note().isEmpty() ? null : line.note());
        payments.initialize(order, recipient, now);
        if (requestId != null) order.registerCheckoutRequest(requestId.toString(), requestHash);
        orders.save(order);
        payments.snapshotRecipient(order, recipient);
        lockedCart.removeItems(lines.stream().map(CartLine::cartItemId).toList(), now);
        // Ghi ngay để lỗi DB trả về trong request này, trước khi phát sự kiện.
        cartRepository.flush();
        publisher.publishEvent(OrderEvents.OrderChanged.from(order, true));
        return CustomerOrder.from(order, payments.qr(order));
    }

    private static boolean matchesPreview(List<CartLine> lines, List<ExpectedCheckoutLine> expected) {
        if (expected == null) return true;
        if (expected.size() != lines.size()) return false;
        Map<Long, BigDecimal> current = new HashMap<>();
        lines.forEach(line -> current.put(line.cartItemId(), line.lineTotal()));
        for (var line : expected) {
            var amount = current.remove(line.id());
            if (amount == null || amount.compareTo(line.lineTotal()) != 0) return false;
        }
        return true;
    }

    private String fingerprint(Checkout request) {
        try {
            byte[] payload = json.writeValueAsBytes(request);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payload));
        } catch (JsonProcessingException | NoSuchAlgorithmException failure) {
            throw new IllegalStateException("Không tạo được mã băm của yêu cầu đặt hàng", failure);
        }
    }

    private RestaurantEntity restaurant(long id) {
        return restaurants.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán"));
    }
}
