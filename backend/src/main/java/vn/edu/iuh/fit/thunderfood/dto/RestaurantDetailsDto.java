package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RestaurantDetailsDto(
        @NotEmpty(message = "Vui lòng bật ít nhất một ngày mở cửa")
        List<@Valid OpeningHourDto> openingHours,

        @NotEmpty(message = "Vui lòng chọn loại hình dịch vụ")
        @Size(max = 2, message = "Chọn tối đa 2 loại hình dịch vụ")
        List<Integer> serviceTypeIds,

        @NotEmpty(message = "Vui lòng chọn ẩm thực")
        @Size(max = 3, message = "Chọn tối đa 3 loại ẩm thực")
        List<Integer> cuisineIds,

        @NotBlank(message = "Vui lòng tải ảnh đại diện quán")
        String avatarImage,

        @NotBlank(message = "Vui lòng tải ảnh mặt tiền quán")
        String coverImage,

        @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
        String description
) {
}
