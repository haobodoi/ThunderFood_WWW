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
import vn.edu.iuh.fit.thunderfood.repository.CustomerReviewRepository;

import java.util.*;
import java.math.BigDecimal;
import org.springframework.data.domain.PageRequest;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantSuggestionDto;

@Service
@Transactional(readOnly = true)
public class PublicRestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final CustomerRules customerRules;
    private final CustomerReviewRepository reviews;

    public PublicRestaurantService(RestaurantRepository restaurantRepository,
                                   MenuCategoryRepository categoryRepository,
                                   MenuItemRepository menuItemRepository, CustomerRules customerRules,
                                   CustomerReviewRepository reviews) {
        this.restaurantRepository = restaurantRepository;
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.customerRules = customerRules;
        this.reviews = reviews;
    }

    public List<RestaurantPublicDto> search(String keyword, String province) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        String pv = (province != null && !province.isBlank()) ? province.trim() : null;

        List<RestaurantEntity> list = restaurantRepository.searchApprovedRestaurants(
                RestaurantStatusEnum.APPROVED, kw, pv);
        if (list.isEmpty()) return List.of();

        Map<Long, CustomerReviewRepository.RatingSummaryView> ratings = reviews.findRatingSummaries(
                        list.stream().map(RestaurantEntity::getId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(CustomerReviewRepository.RestaurantRatingView::getRestaurantId, value -> value));
        return list.stream().map(restaurant -> toPublicDto(restaurant, ratings.get(restaurant.getId()))).toList();
    }

    public RestaurantPublicDto getDetail(Long restaurantId) {
        RestaurantEntity restaurant = restaurantRepository.findByIdAndStatusIn(
                restaurantId, List.of(RestaurantStatusEnum.APPROVED))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà hàng hoặc nhà hàng chưa được kích hoạt"));

        return toPublicDto(restaurant, rating(restaurantId));
    }

    public RestaurantMenuResponseDto getMenu(Long restaurantId) {
        RestaurantEntity restaurant = restaurantRepository.findByIdAndStatusIn(
                restaurantId, List.of(RestaurantStatusEnum.APPROVED))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà hàng hoặc nhà hàng chưa được kích hoạt"));

        RestaurantPublicDto restaurantDto = toPublicDto(restaurant, rating(restaurantId));

        List<MenuCategoryEntity> categories = categoryRepository
                .findByRestaurantIdOrderByDisplayOrderAscIdAsc(restaurantId);

        List<MenuItemEntity> items = menuItemRepository
                .findByRestaurantIdAndDeletedFalseAndApprovalStatusOrderByCategory_DisplayOrderAscItemNameAsc(
                        restaurantId, ApprovalStatusEnum.APPROVED);

        Map<Long, List<MenuItemResponseDto>> itemsByCategory = new LinkedHashMap<>();
        List<MenuItemResponseDto> uncategorized = new ArrayList<>();

        for (MenuItemEntity item : items) {
            if (item.getCategory() != null && !item.getCategory().isVisible()) continue;
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
            if (!cat.isVisible()) continue;
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

    public List<RestaurantSuggestionDto> suggestions(String keyword) {
        String query = keyword == null || keyword.isBlank() ? null : keyword.trim();
        var restaurants = restaurantRepository.searchApprovedRestaurants(RestaurantStatusEnum.APPROVED, query, null).stream()
                .limit(4).map(r -> new RestaurantSuggestionDto("RESTAURANT", r.getId(), r.getRestaurantName(), null, null,
                        customerRules.open(r.getId(), Boolean.TRUE.equals(r.getOpen())))).toList();
        var items = menuItemRepository.findPublicSuggestions(query, PageRequest.of(0, 4)).stream()
                .map(m -> new RestaurantSuggestionDto("ITEM", m.getRestaurantId(), m.getRestaurant().getRestaurantName(),
                        m.getId(), m.getItemName(), customerRules.open(m.getRestaurantId(), Boolean.TRUE.equals(m.getRestaurant().getOpen())))).toList();
        var result = new ArrayList<RestaurantSuggestionDto>(restaurants.size() + items.size());
        result.addAll(restaurants); result.addAll(items);
        return result;
    }

    private CustomerReviewRepository.RatingSummaryView rating(Long restaurantId) {
        return reviews == null ? null : reviews.findRatingSummary(restaurantId).orElse(null);
    }

    public RestaurantPublicDto toPublicDto(RestaurantEntity r) { return toPublicDto(r, rating(r.getId())); }

    private RestaurantPublicDto toPublicDto(RestaurantEntity r, CustomerReviewRepository.RatingSummaryView rating) {
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
                rating == null ? null : rating.getAverageRating(),
                rating == null ? 0 : rating.getReviewCount(),
                openingHours,
                tags
        );
    }
}
