package vn.edu.iuh.fit.thunderfood.dto;

import java.util.List;

public record RestaurantMenuResponseDto(
        RestaurantPublicDto restaurant,
        List<CategoryWithItemsDto> menu
) {
    public record CategoryWithItemsDto(
            Long categoryId,
            String categoryName,
            Integer displayOrder,
            List<MenuItemResponseDto> items
    ) {
    }
}
