package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RestaurantBasicDto(
        @NotBlank(message = "Vui lòng nhập tên quán")
        @Size(max = 60, message = "Tên quán tối đa 60 ký tự")
        String brandName,

        @Size(max = 60, message = "Món đặc trưng tối đa 60 ký tự")
        String specialty,

        @Size(max = 60, message = "Tên đường/khu vực tối đa 60 ký tự")
        String areaName,

        @NotBlank(message = "Vui lòng nhập số điện thoại liên hệ")
        @Pattern(regexp = "^0\\d{9,10}$", message = "Số điện thoại gồm 10–11 chữ số và bắt đầu bằng 0")
        String phone,

        @NotBlank(message = "Vui lòng chọn tỉnh/thành phố")
        String province,

        @NotBlank(message = "Vui lòng nhập phường/xã")
        @Size(max = 100, message = "Phường/xã tối đa 100 ký tự")
        String ward,

        @NotBlank(message = "Vui lòng nhập số nhà và tên đường")
        @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
        String streetAddress
) {
}
