package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.NotNull;

public record RestaurantOpenStatusDto(
        @NotNull(message = "Trạng thái mở cửa không được để trống")
        Boolean open
) {
}
