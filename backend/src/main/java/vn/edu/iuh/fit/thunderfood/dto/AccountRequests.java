package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Requests are deliberately separate from registration: an account email is immutable. */
public final class AccountRequests {
    private AccountRequests() {}

    public record Profile(
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120, message = "Họ tên tối đa 120 ký tự") String fullName,
            @NotBlank(message = "Vui lòng nhập số điện thoại") @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0") String phone,
            @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự") String address) {}

    public record Password(
            @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại") String currentPassword,
            @NotBlank(message = "Vui lòng nhập mật khẩu mới") @Size(min = 6, max = 64, message = "Mật khẩu mới phải từ 6 đến 64 ký tự") String newPassword,
            @NotBlank(message = "Vui lòng nhập lại mật khẩu mới") String confirmPassword) {}
}
