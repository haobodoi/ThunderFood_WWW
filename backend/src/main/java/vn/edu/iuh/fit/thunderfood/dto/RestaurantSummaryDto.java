package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.entity.UserEntity;

import java.time.LocalDateTime;

public record RestaurantSummaryDto(
        Long id,
        String restaurantName,
        String address,
        String status,
        String statusReason,
        Integer registrationStep,
        String avatarImage,
        boolean open,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        LocalDateTime updatedAt,
        String ownerName,
        String ownerEmail
) {
    public static RestaurantSummaryDto from(RestaurantEntity r) {
        UserEntity owner = r.getOwner();
        return new RestaurantSummaryDto(
                r.getId(),
                r.getRestaurantName(),
                r.getAddress(),
                r.getStatus().name(),
                r.getStatusReason(),
                r.getRegistrationStep(),
                r.getAvatarImage(),
                Boolean.TRUE.equals(r.getOpen()),
                r.getSubmittedAt(),
                r.getReviewedAt(),
                r.getUpdatedAt(),
                owner == null ? null : owner.getFullName(),
                owner == null ? null : owner.getEmail()
        );
    }
}
