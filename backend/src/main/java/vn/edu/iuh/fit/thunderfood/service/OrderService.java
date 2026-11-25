package vn.edu.iuh.fit.thunderfood.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import vn.edu.iuh.fit.thunderfood.dto.SepayTransfer;
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
import vn.edu.iuh.fit.thunderfood.repository.SepayPaymentRepository;
import vn.edu.iuh.fit.thunderfood.repository.SepayPaymentRepository.Recipient;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;
import vn.edu.iuh.fit.thunderfood.util.VietQrUtil;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import static vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum.*;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.*;

/**
 * Luồng đơn: PENDING -> CONFIRMED -> PREPARING -> DELIVERING -> COMPLETED; PENDING -> CANCELLED (khách);
 * PENDING/CONFIRMED -> REJECTED (quán). Đơn VietQR được xác nhận qua SePay hoặc khi quán đối soát.
 */
@Service
@Transactional
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final String PARTNER_ROLE = "RESTAURANT_PARTNER", CUSTOMER_ROLE = "CUSTOMER";
    private static final String SEPAY = "SEPAY", SEPAY_MOCK = "SEPAY_MOCK";
    private static final Recipient MOCK_RECIPIENT = new Recipient("970422", "MB Bank", "0000000000", null);
    private static final String CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final int PAGE_SIZE = 10;
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    private static final Map<OrderStatusEnum, OrderStatusEnum> NEXT_STATUS =
            Map.of(CONFIRMED, PREPARING, PREPARING, DELIVERING, DELIVERING, COMPLETED);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrderRepository orders;
    private final RestaurantRepository restaurants;
    private final CartRepository cartRepository;
    private final CustomerRules rules;
    private final CartService carts;
    private final OrderEvents events;
    private final ApplicationEventPublisher publisher;
    private final SepayConfiguration sepay;
    private final SepayPaymentRepository sepayPayments;

    public OrderService(OrderRepository orders,
                        RestaurantRepository restaurants,
                        CartRepository cartRepository,
                        CustomerRules rules,
                        CartService carts,
                        OrderEvents events,
                        ApplicationEventPublisher publisher,
                        SepayConfiguration sepay,
                        SepayPaymentRepository sepayPayments) {
        this.orders = orders;
        this.restaurants = restaurants;
        this.cartRepository = cartRepository;
        this.rules = rules;
        this.carts = carts;
        this.events = events;
        this.publisher = publisher;
        this.sepay = sepay;
        this.sepayPayments = sepayPayments;
    }

    @Transactional(readOnly = true)
    public SseEmitter customerStream(long customer) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        return events.subscribe(customer);
    }

    @Transactional(readOnly = true)
    public SseEmitter partnerStream(long partner) {
        rules.actor(partner, PARTNER_ROLE, false);
        return events.subscribe(partner);
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
                restaurant.getDeliveryFee(), total, checkoutRecipient(restaurant, total).isPresent());
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
        Recipient recipient = method == PaymentMethodEnum.ONLINE ? checkoutRecipient(restaurant, total).orElse(null) : null;
        if (method == PaymentMethodEnum.ONLINE && recipient == null)
            throw new BusinessException(
                    "Quán chưa hỗ trợ thanh toán VietQR cho đơn này. Vui lòng chọn thanh toán khi nhận hàng.");
        boolean simulated = recipient != null && sepay.mockEnabled();
        boolean automatic = recipient != null && sepay.tracks(recipient);

        var now = rules.now();
        String code = "TF-" + now.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + randomCode();
        var order = new OrderEntity(code, customer, restaurant, name, phone, address,
                note.isEmpty() ? null : note, method, subtotal, restaurant.getDeliveryFee(), total, now);
        for (var line : lines)
            order.addItem(line.itemId(), line.itemName(), line.unitPrice(), line.quantity(), line.lineTotal(),
                    line.note().isEmpty() ? null : line.note());
        String provider = switch (method) {
            case COD -> "COD";
            case ONLINE -> simulated ? SEPAY_MOCK : automatic ? SEPAY : "VIETQR";
        };
        order.addPayment(provider, transferContent(code), now);
        orders.save(order);
        // Snapshot every online recipient. The partner may later change bank details while this order is still payable.
        if (recipient != null) sepayPayments.register(order.getId(), recipient);
        lockedCart.removeItems(lines.stream().map(CartLine::cartItemId).toList(), now);
        // Ghi ngay để lỗi DB trả về trong request này, trước khi phát sự kiện.
        cartRepository.flush();
        changed(order, true);
        return CustomerOrder.from(order, simulated ? mockPaymentQr(order)
                : recipient == null ? null : paymentQr(order, recipient, automatic));
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

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> mine(long customer, int page) {
        return mine(customer, "ALL", page);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> mine(long customer, String group, int page) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        var pageable = page(page);
        var result = switch (group == null ? "ALL" : group) {
            case "ALL" -> orders.findByCustomerId(customer, pageable);
            case "PROCESSING" -> orders.findByCustomerIdAndOrderStatusIn(customer, List.of(PENDING, CONFIRMED, PREPARING, DELIVERING), pageable);
            case "COMPLETED" -> orders.findByCustomerIdAndOrderStatusIn(customer, List.of(COMPLETED), pageable);
            case "CLOSED" -> orders.findByCustomerIdAndOrderStatusIn(customer, List.of(CANCELLED, REJECTED), pageable);
            default -> throw new BusinessException("Nhóm đơn hàng không hợp lệ");
        };
        return PageResponse.from(result, OrderSummary::from);
    }

    @Transactional(readOnly = true)
    public CustomerOrder get(long customer, long id) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        var order = orders.findByIdAndCustomerId(id, customer)
                .orElseThrow(OrderService::notFound);
        return CustomerOrder.from(order, qr(order));
    }

    public CustomerOrder cancel(long customer, long id, OrderReason request) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        var order = orders.findWithLockByIdAndCustomerId(id, customer)
                .orElseThrow(OrderService::notFound);
        if (order.getOrderStatus() != PENDING || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID)
            throw new BusinessException(
                    "Đơn đã được quán tiếp nhận nên không thể tự hủy. Vui lòng liên hệ quán.");
        close(order, CANCELLED, text(request.reason(), 5, 500));
        changed(order, false);
        return CustomerOrder.from(order, qr(order));
    }

    @Transactional(readOnly = true)
    public PageResponse<PartnerOrder> partnerOrders(long partner, OrderStatusEnum status, boolean refunds, int page) {
        rules.actor(partner, PARTNER_ROLE, false);
        if (refunds) {
            var result = orders.findByRestaurantOwnerUserIdAndOrderStatusInAndPaymentStatus(
                    partner, List.of(CANCELLED, REJECTED), OrderPaymentStatusEnum.PAID, page(page));
            return PageResponse.from(result, PartnerOrder::from);
        }
        var result = status == null
                ? orders.findByRestaurantOwnerUserId(partner, page(page))
                : orders.findByRestaurantOwnerUserIdAndOrderStatus(partner, status, page(page));
        return PageResponse.from(result, PartnerOrder::from);
    }

    public void updateStatus(long partner, long id, OrderStatus request) {
        rules.actor(partner, PARTNER_ROLE, true);
        var order = ownedOrder(partner, id);
        updateStatus(order, request);
    }

    private void updateStatus(OrderEntity order, OrderStatus request) {
        OrderStatusEnum current = order.getOrderStatus(), target = request.status();
        var now = rules.now();
        if (target == REJECTED) {
            if (current != PENDING && current != CONFIRMED)
                throw new BusinessException("Chỉ từ chối được đơn chưa bắt đầu chế biến");
            close(order, REJECTED, text(request.reason(), 5, 500));
        } else if (target == CONFIRMED) {
            if (current != PENDING) throw new BusinessException("Đơn không còn ở trạng thái chờ xác nhận");
            if (order.getPaymentMethod() == PaymentMethodEnum.ONLINE)
                throw new BusinessException("Đơn VietQR cần xác nhận đã nhận tiền trước");
            order.moveTo(CONFIRMED, now);
        } else {
            if (target != NEXT_STATUS.get(current))
                throw new BusinessException("Không thể chuyển đơn sang trạng thái này");
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
        confirmPayment(order);
    }

    private void confirmPayment(OrderEntity order) {
        if (order.getPaymentMethod() != PaymentMethodEnum.ONLINE
                || order.getOrderStatus() != PENDING
                || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID)
            throw new BusinessException("Đơn này không ở trạng thái chờ xác nhận thanh toán");
        acceptPayment(order, "MANUAL");
    }

    public void reconcileSepay(SepayTransfer transfer) {
        if (!"in".equals(transfer.transferType()) || (transfer.subAccount() != null && !transfer.subAccount().isBlank())) return;
        var code = transfer.orderCode();
        if (code.isEmpty()) return;
        var order = orders.findWithLockByOrderCode(code.get()).orElse(null);
        if (order == null || !order.hasPaymentProvider(SEPAY)) return;
        sepayPayments.findRecipient(order.getId()).ifPresent(recipient -> reconcileSepay(order, recipient, transfer, SEPAY));
    }

    public MockPaymentResult simulateSepay(String transferCode) {
        if (!sepay.mockEnabled()) throw notFound();
        String code = transferCode.replace("-", "").toUpperCase(Locale.ROOT);
        String orderCode = "TF-" + code.substring(2, 10) + "-" + code.substring(10);
        var order = orders.findWithLockByOrderCode(orderCode).orElseThrow(OrderService::notFound);
        if (!order.hasPaymentProvider(SEPAY_MOCK)) throw notFound();
        if (order.getPaymentStatus() == OrderPaymentStatusEnum.PAID) return MockPaymentResult.from(order);
        if (order.getOrderStatus() != PENDING || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID) {
            throw new BusinessException("Đơn này không còn chờ thanh toán mô phỏng");
        }

        var recipient = sepayPayments.findRecipient(order.getId()).orElseThrow(OrderService::notFound);
        // Negative IDs keep simulated receipts separate from bank transaction IDs.
        var transfer = new SepayTransfer(-order.getId(), recipient.bankName(), rules.now(), recipient.accountNumber(), null,
                code, null, "in", order.getTotalAmount(), "MOCK-" + orderCode);
        reconcileSepay(order, recipient, transfer, SEPAY_MOCK);
        if (order.getPaymentStatus() != OrderPaymentStatusEnum.PAID) {
            throw new BusinessException("Không thể đối soát giao dịch mô phỏng cho đơn này");
        }
        return MockPaymentResult.from(order);
    }

    private void reconcileSepay(OrderEntity order, Recipient recipient, SepayTransfer transfer, String source) {
        if (!recipient.accountNumber().equals(transfer.accountNumber())
                || VietQrUtil.binOfGateway(transfer.gateway()).filter(recipient.bankBin()::equals).isEmpty()
                || transfer.transferAmount().compareTo(order.getTotalAmount()) != 0
                || transfer.transactionDate().isBefore(order.getCreatedAt().truncatedTo(ChronoUnit.SECONDS))
                || transfer.transactionDate().isAfter(rules.now().plusMinutes(5))) {
            log.warn("Giao dịch SePay {} không khớp thông tin thanh toán của đơn {}", transfer.id(), order.getOrderCode());
            return;
        }

        boolean pending = order.getOrderStatus() == PENDING && order.getPaymentStatus() == OrderPaymentStatusEnum.UNPAID;
        boolean late = closedOrder(order) && order.getPaymentStatus() == OrderPaymentStatusEnum.FAILED;
        if (!pending && !late && order.getPaymentStatus() != OrderPaymentStatusEnum.PAID) return;
        if (!sepayPayments.recordTransfer(order.getId(), transfer.id(), transfer.referenceCode(), transfer.transactionDate())) return;
        if (pending) {
            acceptPayment(order, source);
        } else if (late) {
            order.settle(OrderPaymentStatusEnum.PAID, PaymentRecordStatusEnum.SUCCESS, source, rules.now());
            changed(order, false);
        }
    }

    private void acceptPayment(OrderEntity order, String source) {
        var now = rules.now();
        order.settle(OrderPaymentStatusEnum.PAID, PaymentRecordStatusEnum.SUCCESS, source, now);
        order.moveTo(CONFIRMED, now);
        changed(order, false);
    }

    public void refund(long partner, long id) {
        rules.actor(partner, PARTNER_ROLE, true);
        var order = ownedOrder(partner, id);
        refund(order);
    }

    private void refund(OrderEntity order) {
        if (!closedOrder(order) || order.getPaymentStatus() != OrderPaymentStatusEnum.PAID)
            throw new BusinessException("Chỉ hoàn tiền được đơn đã thanh toán và đã hủy hoặc bị từ chối");
        order.settle(OrderPaymentStatusEnum.REFUNDED, PaymentRecordStatusEnum.REFUNDED, "MANUAL",
                rules.now());
        changed(order, false);
    }

    private static boolean closedOrder(OrderEntity order) {
        return order.getOrderStatus() == REJECTED || order.getOrderStatus() == CANCELLED;
    }

    /** Admin uses exactly the partner state machine, with a locked row and stale-screen check. */
    public void administer(long id,
                           String action,
                           OrderStatusEnum expectedStatus,
                           OrderPaymentStatusEnum expectedPayment,
                           OrderStatus request) {
        var order = orders.findWithLockById(id).orElseThrow(OrderService::notFound);
        if (order.getOrderStatus() != expectedStatus || order.getPaymentStatus() != expectedPayment)
            throw new ConcurrentUpdateException();
        switch (action) {
            case "status" -> updateStatus(order, request);
            case "confirm-payment" -> confirmPayment(order);
            case "refund" -> refund(order);
            default -> throw new BusinessException("Thao tác đơn hàng không hợp lệ");
        }
        orders.flush();
    }

    private void changed(OrderEntity order, boolean created) {
        publisher.publishEvent(new OrderEvents.OrderChanged(order.getId(), order.getCustomerId(),
                order.getRestaurant().getOwnerUserId(), created));
    }

    /** Đơn đã nhận tiền giữ nguyên PAID để quán còn phải hoàn tiền, không ghi nhận là thanh toán thất bại. */
    private void close(OrderEntity order, OrderStatusEnum status, String reason) {
        var now = rules.now();
        order.close(status, reason, now);
        if (order.getPaymentStatus() == OrderPaymentStatusEnum.UNPAID)
            order.settle(OrderPaymentStatusEnum.FAILED, PaymentRecordStatusEnum.FAILED, status.name(), now);
    }

    private OrderEntity ownedOrder(long partner, long id) {
        return orders.findWithLockByIdAndRestaurantOwnerUserId(id, partner)
                .orElseThrow(OrderService::notFound);
    }

    private RestaurantEntity restaurant(long id) {
        return restaurants.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán"));
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy đơn hàng");
    }

    private PaymentQr qr(OrderEntity order) {
        if (order.getPaymentMethod() != PaymentMethodEnum.ONLINE
                || order.getOrderStatus() != PENDING
                || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID)
            return null;
        if (sepay.mockEnabled()) return order.hasPaymentProvider(SEPAY_MOCK) ? mockPaymentQr(order) : null;
        if (order.hasPaymentProvider(SEPAY_MOCK)) return null;
        return sepayPayments.findRecipient(order.getId())
                .map(recipient -> paymentQr(order, recipient, order.hasPaymentProvider(SEPAY) && sepay.enabled()))
                .orElse(null);
    }

    private static PaymentQr paymentQr(OrderEntity order, Recipient recipient, boolean automatic) {
        String content = transferContent(order.getOrderCode());
        BigDecimal amount = order.getTotalAmount();
        return new PaymentQr(VietQrUtil.payload(recipient.bankBin(), recipient.accountNumber(), amount, content),
                recipient.bankName(), recipient.accountNumber(), recipient.accountHolder(), amount, content, automatic, false);
    }

    private static PaymentQr mockPaymentQr(OrderEntity order) {
        String content = transferContent(order.getOrderCode());
        return new PaymentQr(content, null, null, null, order.getTotalAmount(), content, false, true);
    }

    private Optional<Recipient> checkoutRecipient(RestaurantEntity restaurant, BigDecimal amount) {
        if (!sepay.mockEnabled()) return qrRecipient(restaurant, amount);
        return VietQrUtil.isPayableAmount(amount) ? Optional.of(MOCK_RECIPIENT) : Optional.empty();
    }

    private static Optional<Recipient> qrRecipient(RestaurantEntity restaurant, BigDecimal amount) {
        String account = restaurant.getBankAccountNumber();
        if (account == null || !account.matches("\\d{6,19}") || !VietQrUtil.isPayableAmount(amount))
            return Optional.empty();
        return VietQrUtil.binOf(restaurant.getBankName())
                .map(bin -> new Recipient(bin, restaurant.getBankName(), account, restaurant.getBankAccountHolder()));
    }

    /** Ứng dụng ngân hàng có thể bỏ ký tự đặc biệt, nên nội dung chỉ giữ chữ và số để quán còn đối soát được. */
    private static String transferContent(String orderCode) {
        return orderCode.replace("-", "");
    }

    private static String randomCode() {
        var code = new StringBuilder();
        for (int i = 0; i < 6; i++)
            code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        return code.toString();
    }

    private static Pageable page(int page) {
        if (page < 0 || page > 10000) throw new BusinessException("Trang không hợp lệ");
        return PageRequest.of(page, PAGE_SIZE, NEWEST_FIRST);
    }
}
