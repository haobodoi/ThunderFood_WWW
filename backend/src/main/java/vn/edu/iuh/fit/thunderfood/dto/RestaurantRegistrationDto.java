package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.entity.TagEntity;
import vn.edu.iuh.fit.thunderfood.entity.UserEntity;
import vn.edu.iuh.fit.thunderfood.enums.TagTypeEnum;

import java.time.LocalDateTime;
import java.util.List;

public record RestaurantRegistrationDto(
        Long id,
        String status,
        String statusReason,
        Integer registrationStep,
        String restaurantName,
        String address,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        LocalDateTime updatedAt,
        Long ownerId,
        String ownerName,
        String ownerEmail,
        String ownerPhone,
        RestaurantBasicDto basic,
        RestaurantRepresentativeDto representative,
        RestaurantBankDto bank,
        RestaurantDetailsDto details
) {
    public static RestaurantRegistrationDto from(RestaurantEntity r) {
        UserEntity owner = r.getOwner();
        RestaurantBasicDto basic = new RestaurantBasicDto(
                r.getBrandName(), r.getSpecialty(), r.getAreaName(), r.getPhone(),
                r.getProvince(), r.getWard(), r.getStreetAddress());
        RestaurantRepresentativeDto representative = new RestaurantRepresentativeDto(
                r.getBusinessType(), r.getBusinessName(), r.getTaxCode(), r.getBusinessLicenseImage(),
                r.getRepFullName(), r.getRepEmail(), r.getRepPhone(), r.getRepPhoneAlt(),
                r.getIdNumber(), r.getIdIssuedDate(), r.getIdIssuedPlace(),
                r.getIdFrontImage(), r.getIdBackImage());
        RestaurantBankDto bank = new RestaurantBankDto(
                r.getBankName(), r.getBankBranch(), r.getBankAccountNumber(), r.getBankAccountHolder());
        List<OpeningHourDto> hours = r.getOpeningHours().stream()
                .map(h -> new OpeningHourDto(h.getDayOfWeek(), h.getOpenTime(), h.getCloseTime()))
                .toList();
        RestaurantDetailsDto details = new RestaurantDetailsDto(
                hours,
                tagIds(r, TagTypeEnum.SERVICE_TYPE),
                tagIds(r, TagTypeEnum.CUISINE),
                r.getAvatarImage(),
                r.getCoverImage(),
                r.getDescription());
        return new RestaurantRegistrationDto(
                r.getId(),
                r.getStatus().name(),
                r.getStatusReason(),
                r.getRegistrationStep(),
                r.getRestaurantName(),
                r.getAddress(),
                r.getSubmittedAt(),
                r.getReviewedAt(),
                r.getUpdatedAt(),
                r.getOwnerUserId(),
                owner == null ? null : owner.getFullName(),
                owner == null ? null : owner.getEmail(),
                owner == null ? null : owner.getPhone(),
                basic,
                representative,
                bank,
                details
        );
    }

    private static List<Integer> tagIds(RestaurantEntity r, TagTypeEnum type) {
        return r.getTags().stream()
                .filter(tag -> tag.getTagType() == type)
                .map(TagEntity::getId)
                .sorted()
                .toList();
    }
}
