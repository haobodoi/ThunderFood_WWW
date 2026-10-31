package vn.edu.iuh.fit.thunderfood.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Dữ liệu đơn hàng rời server chỉ qua các record này: thêm cột vào DB không tự lộ ra API. */
public final class OrderResponses {
    private OrderResponses() {}

    public record PageResponse<T>(List<T> items, int page, long total) {}

    public record CheckoutLine(long id, String itemName, int quantity, BigDecimal lineTotal, String note, boolean available) {}
    public record CheckoutPreview(long cartId, long version, String restaurantName, List<CheckoutLine> items,
                                  BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal totalAmount, boolean onlineAvailable) {}

    public record OrderLine(long id, Long itemId, String itemName, BigDecimal unitPrice, int quantity, BigDecimal lineTotal, String note) {}
    public record PaymentQr(String payload, String bankName, String accountNumber, String accountHolder, BigDecimal amount, String content) {}

    public record OrderSummary(long orderId, String orderCode, String restaurantName, String orderStatus, String paymentMethod,
                               String paymentStatus, BigDecimal totalAmount, LocalDateTime createdAt, List<OrderLine> items) {}

    public record CustomerOrder(long orderId, String orderCode, long restaurantId, String restaurantName, String restaurantPhone,
                                String recipientName, String recipientPhone, String deliveryAddress, String note,
                                String orderStatus, String paymentMethod, String paymentStatus,
                                BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal totalAmount, String cancelReason,
                                LocalDateTime createdAt, LocalDateTime completedAt, List<OrderLine> items, PaymentQr qr) {}

    public record PartnerOrder(long orderId, String orderCode, String restaurantName,
                               String recipientName, String recipientPhone, String deliveryAddress, String note,
                               String orderStatus, String paymentMethod, String paymentStatus,
                               BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal totalAmount, String cancelReason,
                               LocalDateTime createdAt, String transferContent, List<OrderLine> items) {}
}
