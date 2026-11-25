package vn.edu.iuh.fit.thunderfood.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.MockPaymentResult;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.PaymentQr;
import vn.edu.iuh.fit.thunderfood.dto.SepayTransfer;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.OrderPaymentStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.PaymentMethodEnum;
import vn.edu.iuh.fit.thunderfood.enums.PaymentRecordStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.OrderRepository;
import vn.edu.iuh.fit.thunderfood.repository.SepayPaymentRepository;
import vn.edu.iuh.fit.thunderfood.repository.SepayPaymentRepository.Recipient;
import vn.edu.iuh.fit.thunderfood.util.OrderCodeUtil;
import vn.edu.iuh.fit.thunderfood.util.VietQrUtil;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum.CONFIRMED;
import static vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum.PENDING;

@Service
public class OrderPaymentService {
    private static final Logger log = LoggerFactory.getLogger(OrderPaymentService.class);
    private static final String SEPAY = "SEPAY", SEPAY_MOCK = "SEPAY_MOCK", VIETQR = "VIETQR";
    private static final Recipient MOCK_RECIPIENT = new Recipient("970422", "MB Bank", "0000000000", null);

    private final OrderRepository orders;
    private final CustomerRules rules;
    private final ApplicationEventPublisher publisher;
    private final SepayConfiguration sepay;
    private final SepayPaymentRepository sepayPayments;

    public OrderPaymentService(OrderRepository orders, CustomerRules rules, ApplicationEventPublisher publisher,
                               SepayConfiguration sepay, SepayPaymentRepository sepayPayments) {
        this.orders = orders;
        this.rules = rules;
        this.publisher = publisher;
        this.sepay = sepay;
        this.sepayPayments = sepayPayments;
    }

    void initialize(OrderEntity order, Recipient recipient, LocalDateTime now) {
        String provider = switch (order.getPaymentMethod()) {
            case COD -> "COD";
            case ONLINE -> sepay.mockEnabled() ? SEPAY_MOCK : sepay.tracks(recipient) ? SEPAY : VIETQR;
        };
        order.addPayment(provider, OrderCodeUtil.transferContent(order.getOrderCode()), now);
    }

    void snapshotRecipient(OrderEntity order, Recipient recipient) {
        if (recipient != null) sepayPayments.register(order.getId(), recipient);
    }

    void confirmManually(OrderEntity order) {
        if (order.getPaymentMethod() != PaymentMethodEnum.ONLINE
                || order.getOrderStatus() != PENDING
                || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID)
            throw new BusinessException("Đơn này không ở trạng thái chờ xác nhận thanh toán");
        acceptPayment(order, "MANUAL");
    }

    @Transactional
    public void reconcileSepay(SepayTransfer transfer) {
        if (!"in".equals(transfer.transferType()) || (transfer.subAccount() != null && !transfer.subAccount().isBlank())) return;
        var code = transfer.orderCode();
        if (code.isEmpty()) return;
        var order = orders.findWithLockByOrderCode(code.get()).orElse(null);
        if (order == null || !order.hasPaymentProvider(SEPAY)) return;
        sepayPayments.findRecipient(order.getId()).ifPresent(recipient -> reconcileSepay(order, recipient, transfer, SEPAY));
    }

    @Transactional
    public MockPaymentResult simulateSepay(String transferCode) {
        if (!sepay.mockEnabled()) throw notFound();
        String orderCode = OrderCodeUtil.parse(transferCode)
                .orElseThrow(() -> new BusinessException("Mã chuyển khoản mô phỏng không hợp lệ"));
        String code = OrderCodeUtil.transferContent(orderCode);
        var order = orders.findWithLockByOrderCode(orderCode).orElseThrow(OrderPaymentService::notFound);
        if (!order.hasPaymentProvider(SEPAY_MOCK)) throw notFound();
        if (order.getPaymentStatus() == OrderPaymentStatusEnum.PAID) return MockPaymentResult.from(order);
        if (order.getOrderStatus() != PENDING || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID) {
            throw new BusinessException("Đơn này không còn chờ thanh toán mô phỏng");
        }

        var recipient = sepayPayments.findRecipient(order.getId()).orElseThrow(OrderPaymentService::notFound);
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
        boolean late = order.isClosed() && order.getPaymentStatus() == OrderPaymentStatusEnum.FAILED;
        if (!pending && !late && order.getPaymentStatus() != OrderPaymentStatusEnum.PAID) return;
        if (!sepayPayments.recordTransfer(order.getId(), transfer.id(), transfer.referenceCode(), transfer.transactionDate())) return;
        if (pending) {
            acceptPayment(order, source);
        } else if (late) {
            order.settle(OrderPaymentStatusEnum.PAID, PaymentRecordStatusEnum.SUCCESS, source, rules.now());
            publisher.publishEvent(OrderEvents.OrderChanged.from(order, false));
        }
    }

    private void acceptPayment(OrderEntity order, String source) {
        var now = rules.now();
        order.settle(OrderPaymentStatusEnum.PAID, PaymentRecordStatusEnum.SUCCESS, source, now);
        order.moveTo(CONFIRMED, now);
        publisher.publishEvent(OrderEvents.OrderChanged.from(order, false));
    }

    PaymentQr qr(OrderEntity order) {
        if (order.getPaymentMethod() != PaymentMethodEnum.ONLINE
                || order.getOrderStatus() != PENDING
                || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID)
            return null;
        if (sepay.mockEnabled()) return order.hasPaymentProvider(SEPAY_MOCK) ? mockPaymentQr(order) : null;
        if (order.hasPaymentProvider(SEPAY_MOCK)) return null;
        var recipient = sepayPayments.findRecipient(order.getId());
        if (recipient.isEmpty() && order.hasPaymentProvider(VIETQR)) {
            // Older manual VietQR orders were created before recipients were stored per order.
            recipient = qrRecipient(order.getRestaurant(), order.getTotalAmount());
        }
        return recipient.map(value -> paymentQr(order, value, order.hasPaymentProvider(SEPAY) && sepay.enabled()))
                .orElse(null);
    }

    private static PaymentQr paymentQr(OrderEntity order, Recipient recipient, boolean automatic) {
        String content = OrderCodeUtil.transferContent(order.getOrderCode());
        BigDecimal amount = order.getTotalAmount();
        return new PaymentQr(VietQrUtil.payload(recipient.bankBin(), recipient.accountNumber(), amount, content),
                recipient.bankName(), recipient.accountNumber(), recipient.accountHolder(), amount, content, automatic, false);
    }

    private static PaymentQr mockPaymentQr(OrderEntity order) {
        String content = OrderCodeUtil.transferContent(order.getOrderCode());
        return new PaymentQr(content, null, null, null, order.getTotalAmount(), content, false, true);
    }

    Optional<Recipient> recipient(RestaurantEntity restaurant, BigDecimal amount) {
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

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy đơn hàng");
    }
}
