package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ tên")
        @Size(max = 120, message = "Họ tên tối đa 120 ký tự")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email")
        @Email(regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message = "Email không hợp lệ")
        @Size(max = 190, message = "Email tối đa 190 ký tự")
        String email,

        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0")
        String phone,

        @NotBlank(message = "Vui lòng nhập mật khẩu")
        @Size(min = 6, max = 64, message = "Mật khẩu phải từ 6 đến 64 ký tự")
        String password,

        @NotBlank(message = "Vui lòng nhập lại mật khẩu")
        String confirmPassword,

        @NotNull(message = "Vui lòng chọn loại tài khoản")
        AccountType accountType,

        @Size(max = 180, message = "Tên nhà hàng tối đa 180 ký tự")
        String restaurantName,

        String restaurantPhone,

        @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
        String restaurantAddress
) {
}
