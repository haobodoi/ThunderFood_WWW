package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RestaurantBankDto(
        @NotBlank(message = "Vui lòng chọn ngân hàng")
        @Size(max = 120, message = "Tên ngân hàng tối đa 120 ký tự")
        String bankName,

        @Size(max = 120, message = "Chi nhánh tối đa 120 ký tự")
        String bankBranch,

        @NotBlank(message = "Vui lòng nhập số tài khoản")
        @Pattern(regexp = "^\\d{6,20}$", message = "Số tài khoản gồm 6–20 chữ số")
        String bankAccountNumber,

        @NotBlank(message = "Vui lòng nhập tên chủ tài khoản")
        @Size(max = 120, message = "Tên chủ tài khoản tối đa 120 ký tự")
        String bankAccountHolder
) {
}
