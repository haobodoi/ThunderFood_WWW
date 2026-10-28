package vn.edu.iuh.fit.thunderfood.dto;

public record MenuCategoryResponseDto(
        Long id,
        Long restaurantId,
        String categoryName,
        Integer displayOrder,
        Long itemCount
) {
}
