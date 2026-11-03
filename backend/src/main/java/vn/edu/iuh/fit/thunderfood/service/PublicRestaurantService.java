package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.*;
import vn.edu.iuh.fit.thunderfood.entity.MenuCategoryEntity;
import vn.edu.iuh.fit.thunderfood.entity.MenuItemEntity;
import vn.edu.iuh.fit.thunderfood.entity.OpeningHourEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.ApprovalStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.MenuCategoryRepository;
import vn.edu.iuh.fit.thunderfood.repository.MenuItemRepository;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class PublicRestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final CustomerRules customerRules;

    public PublicRestaurantService(RestaurantRepository restaurantRepository,
                                   MenuCategoryRepository categoryRepository,
                                   MenuItemRepository menuItemRepository, CustomerRules customerRules) {
        this.restaurantRepository = restaurantRepository;
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.customerRules = customerRules;
    }

    public List<RestaurantPublicDto> search(String keyword, String province) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        String pv = (province != null && !province.isBlank()) ? province.trim() : null;

        List<RestaurantEntity> list = restaurantRepository.searchApprovedRestaurants(
                RestaurantStatusEnum.APPROVED, kw, pv);

        return list.stream().map(this::toPublicDto).toList();
    }

    public RestaurantPublicDto getDetail(Long restaurantId) {
        RestaurantEntity restaurant = restaurantRepository.findByIdAndStatusIn(
                restaurantId, List.of(RestaurantStatusEnum.APPROVED))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà hàng hoặc nhà hàng chưa được kích hoạt"));

        return toPublicDto(restaurant);
    }

    public RestaurantMenuResponseDto getMenu(Long restaurantId) {
        RestaurantEntity restaurant = restaurantRepository.findByIdAndStatusIn(
                restaurantId, List.of(RestaurantStatusEnum.APPROVED))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà hàng hoặc nhà hàng chưa được kích hoạt"));

        RestaurantPublicDto restaurantDto = toPublicDto(restaurant);

        List<MenuCategoryEntity> categories = categoryRepository
                .findByRestaurantIdOrderByDisplayOrderAscIdAsc(restaurantId);

        List<MenuItemEntity> items = menuItemRepository
                .findByRestaurantIdAndDeletedFalseAndApprovalStatusOrderByCategory_DisplayOrderAscItemNameAsc(
                        restaurantId, ApprovalStatusEnum.APPROVED);

        Map<Long, List<MenuItemResponseDto>> itemsByCategory = new LinkedHashMap<>();
        List<MenuItemResponseDto> uncategorized = new ArrayList<>();

        for (MenuItemEntity item : items) {
            String catName = item.getCategory() != null ? item.getCategory().getCategoryName() : null;
            MenuItemResponseDto dto = new MenuItemResponseDto(
                    item.getId(),
                    item.getRestaurantId(),
                    item.getCategoryId(),
                    catName,
                    item.getItemName(),
                    item.getDescription(),
                    item.getPrice(),
                    item.getImageUrl(),
                    item.getAvailable(),
                    item.getApprovalStatus(),
                    item.getStatusReason(),
                    item.getCreatedAt(),
                    item.getUpdatedAt()
            );

            if (item.getCategoryId() == null) {
                uncategorized.add(dto);
            } else {
                itemsByCategory.computeIfAbsent(item.getCategoryId(), k -> new ArrayList<>()).add(dto);
            }
        }

        List<RestaurantMenuResponseDto.CategoryWithItemsDto> menu = new ArrayList<>();

        for (MenuCategoryEntity cat : categories) {
            List<MenuItemResponseDto> catItems = itemsByCategory.getOrDefault(cat.getId(), Collections.emptyList());
            menu.add(new RestaurantMenuResponseDto.CategoryWithItemsDto(
                    cat.getId(),
                    cat.getCategoryName(),
                    cat.getDisplayOrder(),
                    catItems
            ));
        }

        if (!uncategorized.isEmpty()) {
            menu.add(new RestaurantMenuResponseDto.CategoryWithItemsDto(
                    null,
                    "Món khác",
                    999,
                    uncategorized
            ));
        }

        return new RestaurantMenuResponseDto(restaurantDto, menu);
    }

    public RestaurantPublicDto toPublicDto(RestaurantEntity r) {
        List<OpeningHourDto> openingHours = (r.getOpeningHours() == null) ? Collections.emptyList() :
                r.getOpeningHours().stream()
                        .sorted(Comparator.comparingInt(OpeningHourEntity::getDayOfWeek)
                                .thenComparing(OpeningHourEntity::getOpenTime))
                        .map(h -> new OpeningHourDto(
                                h.getDayOfWeek(),
                                h.getOpenTime(),
                                h.getCloseTime()
                        ))
                        .toList();

        List<TagDto> tags = (r.getTags() == null) ? Collections.emptyList() :
                r.getTags().stream()
                        .sorted(Comparator.comparing(vn.edu.iuh.fit.thunderfood.entity.TagEntity::getDisplayOrder))
                        .map(t -> new TagDto(t.getId(), t.getTagType().name(), t.getTagName()))
                        .toList();

        return new RestaurantPublicDto(
                r.getId(),
                r.getRestaurantName(),
                r.getBrandName(),
                r.getSpecialty(),
                r.getAreaName(),
                r.getPhone(),
                r.getProvince(),
                r.getWard(),
                r.getStreetAddress(),
                r.getAddress(),
                r.getDescription(),
                r.getAvatarImage(),
                r.getCoverImage(),
                r.getDeliveryFee(),
                customerRules.open(r.getId(), Boolean.TRUE.equals(r.getOpen())),
                openingHours,
                tags
        );
    }
}
