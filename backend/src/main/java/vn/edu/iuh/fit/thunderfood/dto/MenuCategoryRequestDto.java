package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MenuCategoryRequestDto(
        @NotBlank(message = "Vui lòng nhập tên danh mục")
        @Size(max = 120, message = "Tên danh mục tối đa 120 ký tự")
        String categoryName,

        Integer displayOrder
) {
}
