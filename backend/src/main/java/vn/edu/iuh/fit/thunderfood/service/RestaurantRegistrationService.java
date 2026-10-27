package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.OpeningHourDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantBankDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantBasicDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantDetailsDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantRegistrationDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantRepresentativeDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantSummaryDto;
import vn.edu.iuh.fit.thunderfood.entity.OpeningHourEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.entity.TagEntity;
import vn.edu.iuh.fit.thunderfood.enums.BusinessTypeEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.TagTypeEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.FieldValidationException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;
import vn.edu.iuh.fit.thunderfood.repository.TagRepository;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;
import vn.edu.iuh.fit.thunderfood.util.ProvinceUtil;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@Transactional
public class RestaurantRegistrationService {

    public static final int LAST_STEP = 4;
    private static final int MAX_SLOTS_PER_DAY = 3;
    private static final String TAX_CODE_REGEX = "^\\d{10}(-\\d{3})?$";
    private static final String[] DAY_NAMES = {"", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"};

    private final RestaurantRepository restaurantRepository;
    private final TagRepository tagRepository;
    private final FileStorageService fileStorageService;

    public RestaurantRegistrationService(RestaurantRepository restaurantRepository,
                                         TagRepository tagRepository,
                                         FileStorageService fileStorageService) {
        this.restaurantRepository = restaurantRepository;
        this.tagRepository = tagRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
    public List<RestaurantSummaryDto> listMine(Long ownerId) {
        return restaurantRepository.findByOwnerUserIdOrderByIdDesc(ownerId).stream()
                .map(RestaurantSummaryDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public RestaurantRegistrationDto getMine(Long ownerId, Long restaurantId) {
        return RestaurantRegistrationDto.from(findOwned(ownerId, restaurantId));
    }

    public RestaurantRegistrationDto create(Long ownerId, RestaurantBasicDto dto) {
        RestaurantEntity restaurant = new RestaurantEntity();
        restaurant.setOwnerUserId(ownerId);
        restaurant.setStatus(RestaurantStatusEnum.DRAFT);
        restaurant.setRegistrationStep(1);
        applyBasic(restaurant, dto);
        return RestaurantRegistrationDto.from(restaurantRepository.save(restaurant));
    }

    public RestaurantRegistrationDto updateBasic(Long ownerId, Long restaurantId, RestaurantBasicDto dto) {
        RestaurantEntity restaurant = findEditable(ownerId, restaurantId);
        applyBasic(restaurant, dto);
        advance(restaurant, 1);
        return RestaurantRegistrationDto.from(restaurant);
    }

    public RestaurantRegistrationDto updateRepresentative(Long ownerId, Long restaurantId,
                                                          RestaurantRepresentativeDto dto) {
        RestaurantEntity restaurant = findEditable(ownerId, restaurantId);
        requireStep(restaurant, 1);

        Map<String, String> errors = new LinkedHashMap<>();
        boolean individual = dto.businessType() == BusinessTypeEnum.INDIVIDUAL;
        String businessName = InputNormalizerUtil.textOrNull(dto.businessName());
        String taxCode = InputNormalizerUtil.textOrNull(dto.taxCode());
        String licenseImage = InputNormalizerUtil.textOrNull(dto.businessLicenseImage());
        if (!individual) {
            if (businessName == null) {
                errors.put("businessName", "Vui lòng nhập tên hộ kinh doanh/doanh nghiệp");
            }
            if (taxCode == null) {
                errors.put("taxCode", "Vui lòng nhập mã số thuế");
            } else if (!taxCode.matches(TAX_CODE_REGEX)) {
                errors.put("taxCode", "Mã số thuế gồm 10 số (hoặc 10 số kèm -3 số chi nhánh)");
            }
            if (!fileStorageService.isStoredFile(licenseImage, ownerId, true)) {
                errors.put("businessLicenseImage", "Vui lòng tải ảnh giấy phép kinh doanh");
            }
        }
        if (!fileStorageService.isStoredFile(dto.idFrontImage(), ownerId, true)) {
            errors.put("idFrontImage", "Ảnh mặt trước không hợp lệ, vui lòng tải lại");
        }
        if (!fileStorageService.isStoredFile(dto.idBackImage(), ownerId, true)) {
            errors.put("idBackImage", "Ảnh mặt sau không hợp lệ, vui lòng tải lại");
        }
        throwIfAny(errors);

        restaurant.setBusinessType(dto.businessType());
        restaurant.setBusinessName(individual ? null : businessName);
        restaurant.setTaxCode(individual ? null : taxCode);
        restaurant.setBusinessLicenseImage(individual ? null : licenseImage);
        restaurant.setRepFullName(InputNormalizerUtil.text(dto.repFullName()));
        restaurant.setRepEmail(InputNormalizerUtil.email(dto.repEmail()));
        restaurant.setRepPhone(InputNormalizerUtil.phone(dto.repPhone()));
        restaurant.setRepPhoneAlt(InputNormalizerUtil.phoneOrNull(dto.repPhoneAlt()));
        restaurant.setIdNumber(dto.idNumber().trim().toUpperCase());
        restaurant.setIdIssuedDate(dto.idIssuedDate());
        restaurant.setIdIssuedPlace(InputNormalizerUtil.text(dto.idIssuedPlace()));
        restaurant.setIdFrontImage(dto.idFrontImage());
        restaurant.setIdBackImage(dto.idBackImage());
        advance(restaurant, 2);
        return RestaurantRegistrationDto.from(restaurant);
    }

    public RestaurantRegistrationDto updateBank(Long ownerId, Long restaurantId, RestaurantBankDto dto) {
        RestaurantEntity restaurant = findEditable(ownerId, restaurantId);
        requireStep(restaurant, 2);

        String holder = InputNormalizerUtil.foldName(dto.bankAccountHolder());
        boolean matchesRepresentative = holder.equals(InputNormalizerUtil.foldName(restaurant.getRepFullName()));
        boolean matchesBusiness = restaurant.getBusinessType() != BusinessTypeEnum.INDIVIDUAL
                && holder.equals(InputNormalizerUtil.foldName(restaurant.getBusinessName()));
        if (!matchesRepresentative && !matchesBusiness) {
            String message = restaurant.getBusinessType() == BusinessTypeEnum.INDIVIDUAL
                    ? "Tên chủ tài khoản phải trùng với tên người đại diện"
                    : "Tên chủ tài khoản phải trùng với tên người đại diện hoặc tên hộ kinh doanh/doanh nghiệp";
            throwIfAny(Map.of("bankAccountHolder", message));
        }

        restaurant.setBankName(InputNormalizerUtil.text(dto.bankName()));
        restaurant.setBankBranch(InputNormalizerUtil.textOrNull(dto.bankBranch()));
        restaurant.setBankAccountNumber(dto.bankAccountNumber().trim());
        restaurant.setBankAccountHolder(holder);
        advance(restaurant, 3);
        return RestaurantRegistrationDto.from(restaurant);
    }

    public RestaurantRegistrationDto updateDetails(Long ownerId, Long restaurantId, RestaurantDetailsDto dto) {
        RestaurantEntity restaurant = findEditable(ownerId, restaurantId);
        requireStep(restaurant, 3);

        Map<String, String> errors = new LinkedHashMap<>();
        String hoursError = validateOpeningHours(dto.openingHours());
        if (hoursError != null) {
            errors.put("openingHours", hoursError);
        }

        Set<Integer> serviceIds = new LinkedHashSet<>(dto.serviceTypeIds());
        Set<Integer> cuisineIds = new LinkedHashSet<>(dto.cuisineIds());
        Map<Integer, TagEntity> tags = tagRepository.findAllById(
                        Stream.concat(serviceIds.stream(), cuisineIds.stream()).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(TagEntity::getId, tag -> tag));
        if (!allOfType(serviceIds, tags, TagTypeEnum.SERVICE_TYPE)) {
            errors.put("serviceTypeIds", "Loại hình dịch vụ không hợp lệ");
        }
        if (!allOfType(cuisineIds, tags, TagTypeEnum.CUISINE)) {
            errors.put("cuisineIds", "Ẩm thực không hợp lệ");
        }
        if (!fileStorageService.isStoredFile(dto.avatarImage(), ownerId, false)) {
            errors.put("avatarImage", "Ảnh đại diện không hợp lệ, vui lòng tải lại");
        }
        if (!fileStorageService.isStoredFile(dto.coverImage(), ownerId, false)) {
            errors.put("coverImage", "Ảnh mặt tiền không hợp lệ, vui lòng tải lại");
        }
        throwIfAny(errors);

        restaurant.getOpeningHours().clear();
        dto.openingHours().stream()
                .sorted(Comparator.comparing(OpeningHourDto::dayOfWeek).thenComparing(OpeningHourDto::openTime))
                .forEach(h -> restaurant.getOpeningHours().add(
                        new OpeningHourEntity(restaurant, h.dayOfWeek(), h.openTime(), h.closeTime())));
        restaurant.getTags().clear();
        Stream.concat(serviceIds.stream(), cuisineIds.stream()).map(tags::get).forEach(restaurant.getTags()::add);
        restaurant.setAvatarImage(dto.avatarImage());
        restaurant.setCoverImage(dto.coverImage());
        restaurant.setDescription(InputNormalizerUtil.textOrNull(dto.description()));
        advance(restaurant, 4);
        return RestaurantRegistrationDto.from(restaurant);
    }

    public RestaurantRegistrationDto submit(Long ownerId, Long restaurantId) {
        RestaurantEntity restaurant = findEditable(ownerId, restaurantId);
        if (restaurant.getRegistrationStep() < LAST_STEP) {
            throw new BusinessException("Vui lòng hoàn thành đủ " + LAST_STEP + " bước trước khi gửi duyệt");
        }
        String missing = findMissingStep(restaurant);
        if (missing != null) {
            throw new BusinessException("Hồ sơ còn thiếu thông tin ở bước \"" + missing + "\"");
        }
        restaurant.setStatus(RestaurantStatusEnum.PENDING);
        restaurant.setSubmittedAt(LocalDateTime.now());
        restaurant.setStatusReason(null);
        restaurant.setReviewedBy(null);
        restaurant.setReviewedAt(null);
        return RestaurantRegistrationDto.from(restaurant);
    }

    public void deleteDraft(Long ownerId, Long restaurantId) {
        RestaurantEntity restaurant = findOwned(ownerId, restaurantId);
        if (restaurant.getStatus() != RestaurantStatusEnum.DRAFT) {
            throw new BusinessException("Chỉ có thể xóa hồ sơ đang ở trạng thái nháp");
        }
        restaurantRepository.delete(restaurant);
    }

    private void applyBasic(RestaurantEntity restaurant, RestaurantBasicDto dto) {
        String province = InputNormalizerUtil.text(dto.province());
        if (!ProvinceUtil.isValid(province)) {
            throwIfAny(Map.of("province", "Tỉnh/thành phố không hợp lệ"));
        }
        String brandName = InputNormalizerUtil.text(dto.brandName());
        String specialty = InputNormalizerUtil.textOrNull(dto.specialty());
        String areaName = InputNormalizerUtil.textOrNull(dto.areaName());
        String ward = InputNormalizerUtil.text(dto.ward());
        String street = InputNormalizerUtil.text(dto.streetAddress());

        restaurant.setBrandName(brandName);
        restaurant.setSpecialty(specialty);
        restaurant.setAreaName(areaName);
        restaurant.setRestaurantName(Stream.of(brandName, specialty, areaName)
                .filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(" - ")));
        restaurant.setPhone(InputNormalizerUtil.phone(dto.phone()));
        restaurant.setProvince(province);
        restaurant.setWard(ward);
        restaurant.setStreetAddress(street);
        restaurant.setAddress(street + ", " + ward + ", " + province);
    }

    private String validateOpeningHours(List<OpeningHourDto> hours) {
        Map<Integer, List<OpeningHourDto>> byDay = new TreeMap<>();
        for (OpeningHourDto hour : hours) {
            if (!hour.closeTime().isAfter(hour.openTime())) {
                return DAY_NAMES[hour.dayOfWeek()] + ": giờ đóng cửa phải sau giờ mở cửa";
            }
            byDay.computeIfAbsent(hour.dayOfWeek(), d -> new ArrayList<>()).add(hour);
        }
        for (Map.Entry<Integer, List<OpeningHourDto>> entry : byDay.entrySet()) {
            List<OpeningHourDto> slots = entry.getValue();
            if (slots.size() > MAX_SLOTS_PER_DAY) {
                return DAY_NAMES[entry.getKey()] + ": tối đa " + MAX_SLOTS_PER_DAY + " khung giờ";
            }
            slots.sort(Comparator.comparing(OpeningHourDto::openTime));
            for (int i = 1; i < slots.size(); i++) {
                if (slots.get(i).openTime().isBefore(slots.get(i - 1).closeTime())) {
                    return DAY_NAMES[entry.getKey()] + ": các khung giờ bị chồng lên nhau";
                }
            }
        }
        return null;
    }

    private static boolean allOfType(Set<Integer> ids, Map<Integer, TagEntity> tags, TagTypeEnum type) {
        return ids.stream().allMatch(id -> tags.containsKey(id) && tags.get(id).getTagType() == type);
    }

    private String findMissingStep(RestaurantEntity r) {
        if (anyBlank(r.getBrandName(), r.getPhone(), r.getProvince(), r.getWard(), r.getStreetAddress())) {
            return "Thông tin quán - Cơ bản";
        }
        boolean individual = r.getBusinessType() == BusinessTypeEnum.INDIVIDUAL;
        if (r.getBusinessType() == null || r.getIdIssuedDate() == null
                || anyBlank(r.getRepFullName(), r.getRepEmail(), r.getRepPhone(), r.getIdNumber(),
                r.getIdIssuedPlace(), r.getIdFrontImage(), r.getIdBackImage())
                || (!individual && anyBlank(r.getBusinessName(), r.getTaxCode(), r.getBusinessLicenseImage()))) {
            return "Thông tin người đại diện";
        }
        if (anyBlank(r.getBankName(), r.getBankAccountNumber(), r.getBankAccountHolder())) {
            return "Thông tin ngân hàng";
        }
        boolean hasService = r.getTags().stream().anyMatch(t -> t.getTagType() == TagTypeEnum.SERVICE_TYPE);
        boolean hasCuisine = r.getTags().stream().anyMatch(t -> t.getTagType() == TagTypeEnum.CUISINE);
        if (r.getOpeningHours().isEmpty() || !hasService || !hasCuisine
                || anyBlank(r.getAvatarImage(), r.getCoverImage())) {
            return "Thông tin quán - Chi tiết";
        }
        return null;
    }

    private static boolean anyBlank(String... values) {
        for (String value : values) {
            if (InputNormalizerUtil.isBlank(value)) {
                return true;
            }
        }
        return false;
    }

    private RestaurantEntity findOwned(Long ownerId, Long restaurantId) {
        return restaurantRepository.findByIdAndOwnerUserId(restaurantId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đăng ký quán"));
    }

    private RestaurantEntity findEditable(Long ownerId, Long restaurantId) {
        RestaurantEntity restaurant = findOwned(ownerId, restaurantId);
        if (!restaurant.getStatus().isEditableByOwner()) {
            throw new BusinessException("Hồ sơ đang chờ duyệt hoặc đã được duyệt nên không thể chỉnh sửa");
        }
        return restaurant;
    }

    private static void requireStep(RestaurantEntity restaurant, int previousStep) {
        if (restaurant.getRegistrationStep() < previousStep) {
            throw new BusinessException("Vui lòng hoàn thành bước " + previousStep + " trước");
        }
    }

    private static void advance(RestaurantEntity restaurant, int step) {
        restaurant.setRegistrationStep(Math.max(restaurant.getRegistrationStep(), step));
    }

    private static void throwIfAny(Map<String, String> errors) {
        if (!errors.isEmpty()) {
            throw new FieldValidationException("Thông tin chưa hợp lệ", errors);
        }
    }
}
