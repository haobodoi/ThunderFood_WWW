package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.*;

public final class CustomerRequests {
    private CustomerRequests() {}
    public record AddItem(@NotNull @Positive Long itemId, @Min(1) @Max(99) int quantity,
                          @Size(max = 300) String note, @NotNull @PositiveOrZero Long version) {}
    public record ChangeItem(@Min(1) @Max(99) int quantity, @Size(max = 300) String note,
                             @NotNull @PositiveOrZero Long version) {}
    public record Review(@NotNull @Positive Long orderId, @Min(1) @Max(5) int rating,
                         @NotBlank @Size(max = 1000) String content) {}
    public record EditReview(@Min(1) @Max(5) int rating, @NotBlank @Size(max = 1000) String content,
                             @NotNull @PositiveOrZero Long version) {}
    public record Reply(@NotBlank @Size(max = 1000) String content, @NotNull @PositiveOrZero Long version) {}
    public record Report(@NotBlank String reasonCode, @NotBlank @Size(min = 5, max = 500) String reason) {}
    public record Moderate(@NotBlank String status, @NotBlank @Size(min = 5, max = 500) String reason,
                           @NotNull @PositiveOrZero Long version) {}
    public record ResolveReport(@NotBlank String status, @NotBlank @Size(max = 500) String note) {}
    /** expectedTotal chỉ dùng để phát hiện giá đổi so với màn hình khách đang xem; tiền luôn do server tính. */
    public record Checkout(@NotNull @Positive Long cartId, @NotNull @PositiveOrZero Long version,
                           @NotBlank(message = "Vui lòng nhập tên người nhận") @Size(max = 120, message = "Tên người nhận tối đa 120 ký tự") String recipientName,
                           @NotBlank(message = "Vui lòng nhập số điện thoại") @Size(max = 20, message = "Số điện thoại không hợp lệ") String recipientPhone,
                           @NotBlank(message = "Vui lòng nhập địa chỉ giao hàng") @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự") String deliveryAddress,
                           @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự") String note,
                           @NotBlank String paymentMethod, @NotNull @PositiveOrZero java.math.BigDecimal expectedTotal) {}
    public record OrderReason(@NotBlank @Size(min = 5, max = 500) String reason) {}
    public record OrderStatus(@NotBlank String status, @Size(max = 500) String reason) {}
}
