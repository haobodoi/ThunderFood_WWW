package vn.edu.iuh.fit.thunderfood.dto;

import org.springframework.data.domain.Page;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.entity.OrderItemEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;

/** Dữ liệu đơn hàng rời server chỉ qua các record này: thêm cột vào DB không tự lộ ra API. */
public final class OrderResponses {
    private OrderResponses() {}

    public record PageResponse<T>(List<T> items, int page, long total) {
        public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
            return new PageResponse<>(page.getContent().stream().map(mapper).toList(), page.getNumber(), page.getTotalElements());
        }
    }

    public record CheckoutLine(long id, String itemName, int quantity, BigDecimal lineTotal, String note, boolean available) {}
    public record CheckoutPreview(long cartId, long version, String restaurantName, List<CheckoutLine> items,
                                  BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal totalAmount, boolean onlineAvailable) {}

    public record OrderLine(long id, Long itemId, String itemName, BigDecimal unitPrice, int quantity, BigDecimal lineTotal, String note) {
        static List<OrderLine> from(List<OrderItemEntity> items) {
            return items.stream().map(line -> new OrderLine(line.getId(), line.getItemId(), line.getItemName(), line.getUnitPrice(), line.getQuantity(), line.getLineTotal(), line.getNote())).toList();
        }
    }
    public record PaymentQr(String payload, String bankName, String accountNumber, String accountHolder, BigDecimal amount, String content) {}

    public record OrderSummary(long orderId, String orderCode, String restaurantName, String orderStatus, String paymentMethod,
                               String paymentStatus, BigDecimal totalAmount, LocalDateTime createdAt, List<OrderLine> items) {
        public static OrderSummary from(OrderEntity order) {
            return new OrderSummary(order.getId(), order.getOrderCode(), order.getRestaurant().getRestaurantName(), order.getOrderStatus().name(), order.getPaymentMethod().name(),
                    order.getPaymentStatus().name(), order.getTotalAmount(), order.getCreatedAt(), OrderLine.from(order.getItems()));
        }
    }

    public record CustomerOrder(long orderId, String orderCode, long restaurantId, String restaurantName, String restaurantPhone,
                                String recipientName, String recipientPhone, String deliveryAddress, String note,
                                String orderStatus, String paymentMethod, String paymentStatus,
                                BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal totalAmount, String cancelReason,
                                LocalDateTime createdAt, LocalDateTime completedAt, List<OrderLine> items, PaymentQr qr) {
        public static CustomerOrder from(OrderEntity order, PaymentQr qr) {
            var restaurant = order.getRestaurant();
            return new CustomerOrder(order.getId(), order.getOrderCode(), restaurant.getId(), restaurant.getRestaurantName(), restaurant.getPhone(),
                    order.getRecipientName(), order.getRecipientPhone(), order.getDeliveryAddress(), order.getNote(),
                    order.getOrderStatus().name(), order.getPaymentMethod().name(), order.getPaymentStatus().name(),
                    order.getSubtotal(), order.getDeliveryFee(), order.getTotalAmount(), order.getCancelReason(),
                    order.getCreatedAt(), order.getCompletedAt(), OrderLine.from(order.getItems()), qr);
        }
    }

    public record PartnerOrder(long orderId, String orderCode, String restaurantName,
                               String recipientName, String recipientPhone, String deliveryAddress, String note,
                               String orderStatus, String paymentMethod, String paymentStatus,
                               BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal totalAmount, String cancelReason,
                               LocalDateTime createdAt, String transferContent, List<OrderLine> items) {
        public static PartnerOrder from(OrderEntity order) {
            String transferContent = order.getPayments().isEmpty() ? null : order.getPayments().getFirst().getTransactionCode();
            return new PartnerOrder(order.getId(), order.getOrderCode(), order.getRestaurant().getRestaurantName(),
                    order.getRecipientName(), order.getRecipientPhone(), order.getDeliveryAddress(), order.getNote(),
                    order.getOrderStatus().name(), order.getPaymentMethod().name(), order.getPaymentStatus().name(),
                    order.getSubtotal(), order.getDeliveryFee(), order.getTotalAmount(), order.getCancelReason(),
                    order.getCreatedAt(), transferContent, OrderLine.from(order.getItems()));
        }
    }
}
