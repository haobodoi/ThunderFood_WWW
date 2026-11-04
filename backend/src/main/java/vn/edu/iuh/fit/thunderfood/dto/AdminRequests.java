package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.*;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.OrderPaymentStatusEnum;
import java.math.BigDecimal;

public final class AdminRequests {
    private AdminRequests() {}
    public record OrderAction(@NotNull OrderStatusEnum expectedStatus, @NotNull OrderPaymentStatusEnum expectedPayment,
                              OrderStatusEnum status, @Size(max=500) String reason) {}
    public record Note(@NotBlank @Size(min=5,max=500) String reason) {}
    public record Visibility(@NotNull Boolean visible) {}
    public record UserAccess(@Pattern(regexp="ACTIVE|LOCKED") @NotBlank String status,
                             @Pattern(regexp="CUSTOMER|RESTAURANT_PARTNER|ADMIN|STAFF") @NotBlank String role,
                             @NotBlank @Size(min=5,max=500) String reason) {}
    public record Staff(@NotBlank @Size(max=120) String fullName, @NotBlank @Email @Size(max=190) String email,
                        @NotBlank @Pattern(regexp="0\\d{9}") String phone,
                        @NotBlank @Size(min=12,max=72) String password,
                        @NotBlank @Pattern(regexp="ADMIN|STAFF") String role) {}
    public record Store(@NotNull @DecimalMin("0") @DecimalMax("9999999999.99") @Digits(integer=10,fraction=2) BigDecimal deliveryFee,
                        @NotNull Boolean open) {}
    public record Complaint(@NotBlank @Pattern(regexp="PROCESSING|RESOLVED|REJECTED") String status,
                            @NotBlank @Size(min=5,max=2000) String response) {}
}
