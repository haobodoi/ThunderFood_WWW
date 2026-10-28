package vn.edu.iuh.fit.thunderfood.dto;

import java.math.BigDecimal;
import java.util.List;

public record RestaurantPublicDto(
        Long id,
        String restaurantName,
        String brandName,
        String specialty,
        String areaName,
        String phone,
        String province,
        String ward,
        String streetAddress,
        String address,
        String description,
        String avatarImage,
        String coverImage,
        BigDecimal deliveryFee,
        Boolean open,
        List<OpeningHourDto> openingHours,
        List<TagDto> tags
) {
}
