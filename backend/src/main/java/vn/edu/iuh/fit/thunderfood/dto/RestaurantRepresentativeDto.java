package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import vn.edu.iuh.fit.thunderfood.enums.BusinessTypeEnum;

import java.time.LocalDate;

public record RestaurantRepresentativeDto(
        @NotNull(message = "Vui lòng chọn hình thức đăng ký")
        BusinessTypeEnum businessType,

        @Size(max = 200, message = "Tên hộ kinh doanh/doanh nghiệp tối đa 200 ký tự")
        String businessName,

        String taxCode,

        String businessLicenseImage,

        @NotBlank(message = "Vui lòng nhập họ tên người đại diện")
        @Size(max = 120, message = "Họ tên tối đa 120 ký tự")
        String repFullName,

        @NotBlank(message = "Vui lòng nhập email")
        @Email(regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message = "Email không hợp lệ")
        @Size(max = 190, message = "Email tối đa 190 ký tự")
        String repEmail,

        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0")
        String repPhone,

        @Pattern(regexp = "^(0\\d{9})?$", message = "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0")
        String repPhoneAlt,

        @NotBlank(message = "Vui lòng nhập số CMND/CCCD/Hộ chiếu")
        @Pattern(regexp = "^(\\d{9}|\\d{12}|[A-Za-z]\\d{7})$",
                message = "CMND gồm 9 số, CCCD gồm 12 số, hộ chiếu gồm 1 chữ cái và 7 số")
        String idNumber,

        @NotNull(message = "Vui lòng chọn ngày cấp")
        @PastOrPresent(message = "Ngày cấp không được ở tương lai")
        LocalDate idIssuedDate,

        @NotBlank(message = "Vui lòng nhập nơi cấp")
        @Size(max = 150, message = "Nơi cấp tối đa 150 ký tự")
        String idIssuedPlace,

        @NotBlank(message = "Vui lòng tải ảnh mặt trước")
        String idFrontImage,

        @NotBlank(message = "Vui lòng tải ảnh mặt sau")
        String idBackImage
) {
}
