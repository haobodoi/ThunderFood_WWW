package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record MenuItemRequestDto(
        Long categoryId,

        @NotBlank(message = "Vui lòng nhập tên món ăn")
        @Size(max = 180, message = "Tên món ăn tối đa 180 ký tự")
        String itemName,

        @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
        String description,

        @NotNull(message = "Vui lòng nhập giá món ăn")
        @DecimalMin(value = "0.0", message = "Giá món ăn không được âm")
        BigDecimal price,

        @Size(max = 1000, message = "Đường dẫn ảnh tối đa 1000 ký tự")
        String imageUrl,

        Boolean available
) {
}
