package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.enums.ApprovalStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MenuItemResponseDto(
        Long id,
        Long restaurantId,
        Long categoryId,
        String categoryName,
        String itemName,
        String description,
        BigDecimal price,
        String imageUrl,
        Boolean available,
        ApprovalStatusEnum approvalStatus,
        String statusReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
