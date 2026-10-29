package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.*;
import vn.edu.iuh.fit.thunderfood.entity.MenuCategoryEntity;
import vn.edu.iuh.fit.thunderfood.entity.MenuItemEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.ApprovalStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.MenuCategoryRepository;
import vn.edu.iuh.fit.thunderfood.repository.MenuItemRepository;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class PartnerMenuService {

    private final RestaurantRepository restaurantRepository;
    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;

    public PartnerMenuService(RestaurantRepository restaurantRepository,
                              MenuCategoryRepository categoryRepository,
                              MenuItemRepository menuItemRepository) {
        this.restaurantRepository = restaurantRepository;
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
    }

    private RestaurantEntity checkOwnership(Long ownerId, Long restaurantId) {
        return restaurantRepository.findByIdAndOwnerUserId(restaurantId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin quán"));
    }

    // ---------- TRẠNG THÁI MỞ / ĐÓNG CỬA ----------
    public RestaurantOpenStatusDto updateOpenStatus(Long ownerId, Long restaurantId, Boolean open) {
        RestaurantEntity restaurant = checkOwnership(ownerId, restaurantId);
        if (Boolean.TRUE.equals(open) && restaurant.getStatus() != RestaurantStatusEnum.APPROVED) {
            throw new BusinessException("Chỉ quán đã được duyệt mới có thể mở cửa nhận đơn");
        }
        restaurant.setOpen(Boolean.TRUE.equals(open));
        restaurantRepository.save(restaurant);
        return new RestaurantOpenStatusDto(restaurant.getOpen());
    }

    // ---------- QUẢN LÝ DANH MỤC ----------
    @Transactional(readOnly = true)
    public List<MenuCategoryResponseDto> listCategories(Long ownerId, Long restaurantId) {
        checkOwnership(ownerId, restaurantId);
        List<MenuCategoryEntity> categories = categoryRepository.findByRestaurantIdOrderByDisplayOrderAscIdAsc(restaurantId);

        List<MenuItemEntity> items = menuItemRepository.findByRestaurantIdAndDeletedFalseOrderByCreatedAtDesc(restaurantId);
        Map<Long, Long> counts = items.stream()
                .filter(i -> i.getCategoryId() != null)
                .collect(Collectors.groupingBy(MenuItemEntity::getCategoryId, Collectors.counting()));

        return categories.stream()
                .map(cat -> new MenuCategoryResponseDto(
                        cat.getId(),
                        cat.getRestaurantId(),
                        cat.getCategoryName(),
                        cat.getDisplayOrder(),
                        counts.getOrDefault(cat.getId(), 0L)
                ))
                .toList();
    }

    public MenuCategoryResponseDto createCategory(Long ownerId, Long restaurantId, MenuCategoryRequestDto request) {
        checkOwnership(ownerId, restaurantId);
        String name = request.categoryName() != null ? request.categoryName().trim() : "";
        if (categoryRepository.existsByRestaurantIdAndCategoryNameIgnoreCase(restaurantId, name)) {
            throw new BusinessException("Tên danh mục \"" + name + "\" đã tồn tại");
        }
        Integer order = request.displayOrder() != null ? request.displayOrder() : 0;
        MenuCategoryEntity entity = new MenuCategoryEntity(restaurantId, name, order);
        entity = categoryRepository.save(entity);
        return new MenuCategoryResponseDto(entity.getId(), entity.getRestaurantId(), entity.getCategoryName(), entity.getDisplayOrder(), 0L);
    }

    public MenuCategoryResponseDto updateCategory(Long ownerId, Long restaurantId, Long categoryId, MenuCategoryRequestDto request) {
        checkOwnership(ownerId, restaurantId);
        MenuCategoryEntity entity = categoryRepository.findByIdAndRestaurantId(categoryId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        String name = request.categoryName() != null ? request.categoryName().trim() : "";
        if (categoryRepository.existsByRestaurantIdAndCategoryNameIgnoreCaseAndIdNot(restaurantId, name, categoryId)) {
            throw new BusinessException("Tên danh mục \"" + name + "\" đã tồn tại");
        }

        entity.setCategoryName(name);
        if (request.displayOrder() != null) {
            entity.setDisplayOrder(request.displayOrder());
        }
        categoryRepository.save(entity);

        long count = menuItemRepository.countByCategoryIdAndDeletedFalse(categoryId);
        return new MenuCategoryResponseDto(entity.getId(), entity.getRestaurantId(), entity.getCategoryName(), entity.getDisplayOrder(), count);
    }

    public void deleteCategory(Long ownerId, Long restaurantId, Long categoryId) {
        checkOwnership(ownerId, restaurantId);
        MenuCategoryEntity entity = categoryRepository.findByIdAndRestaurantId(categoryId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        // Gỡ liên kết các món ăn thuộc category này về null trước khi xóa
        menuItemRepository.clearCategoryForItems(categoryId);
        categoryRepository.delete(entity);
    }

    // ---------- QUẢN LÝ MÓN ĂN ----------
    @Transactional(readOnly = true)
    public List<MenuItemResponseDto> listItems(Long ownerId, Long restaurantId) {
        checkOwnership(ownerId, restaurantId);
        List<MenuItemEntity> items = menuItemRepository.findByRestaurantIdAndDeletedFalseOrderByCreatedAtDesc(restaurantId);
        return items.stream().map(this::toItemDto).toList();
    }

    @Transactional(readOnly = true)
    public MenuItemResponseDto getItem(Long ownerId, Long restaurantId, Long itemId) {
        checkOwnership(ownerId, restaurantId);
        MenuItemEntity item = menuItemRepository.findByIdAndRestaurantIdAndDeletedFalse(itemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn"));
        return toItemDto(item);
    }

    public MenuItemResponseDto createItem(Long ownerId, Long restaurantId, MenuItemRequestDto request) {
        checkOwnership(ownerId, restaurantId);

        if (request.categoryId() != null) {
            categoryRepository.findByIdAndRestaurantId(request.categoryId(), restaurantId)
                    .orElseThrow(() -> new BusinessException("Danh mục được chọn không hợp lệ hoặc không thuộc quán"));
        }

        MenuItemEntity item = new MenuItemEntity();
        item.setRestaurantId(restaurantId);
        item.setCategoryId(request.categoryId());
        item.setItemName(request.itemName().trim());
        item.setDescription(request.description() != null ? request.description().trim() : null);
        item.setPrice(request.price());
        item.setImageUrl(request.imageUrl());
        item.setAvailable(request.available() != null ? request.available() : Boolean.TRUE);
        item.setApprovalStatus(ApprovalStatusEnum.APPROVED); // Mặc định duyệt để quán có thể kinh doanh ngay
        item.setDeleted(Boolean.FALSE);

        item = menuItemRepository.save(item);
        return toItemDto(item);
    }

    public MenuItemResponseDto updateItem(Long ownerId, Long restaurantId, Long itemId, MenuItemRequestDto request) {
        checkOwnership(ownerId, restaurantId);
        MenuItemEntity item = menuItemRepository.findByIdAndRestaurantIdAndDeletedFalse(itemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn"));

        if (request.categoryId() != null) {
            categoryRepository.findByIdAndRestaurantId(request.categoryId(), restaurantId)
                    .orElseThrow(() -> new BusinessException("Danh mục được chọn không hợp lệ hoặc không thuộc quán"));
        }

        item.setCategoryId(request.categoryId());
        item.setItemName(request.itemName().trim());
        item.setDescription(request.description() != null ? request.description().trim() : null);
        item.setPrice(request.price());
        if (request.imageUrl() != null) {
            item.setImageUrl(request.imageUrl());
        }
        if (request.available() != null) {
            item.setAvailable(request.available());
        }

        item = menuItemRepository.save(item);
        return toItemDto(item);
    }

    public MenuItemResponseDto toggleAvailability(Long ownerId, Long restaurantId, Long itemId, Boolean available) {
        checkOwnership(ownerId, restaurantId);
        MenuItemEntity item = menuItemRepository.findByIdAndRestaurantIdAndDeletedFalse(itemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn"));

        boolean newStatus = available != null ? available : !Boolean.TRUE.equals(item.getAvailable());
        item.setAvailable(newStatus);
        item = menuItemRepository.save(item);
        return toItemDto(item);
    }

    public void deleteItem(Long ownerId, Long restaurantId, Long itemId) {
        checkOwnership(ownerId, restaurantId);
        MenuItemEntity item = menuItemRepository.findByIdAndRestaurantIdAndDeletedFalse(itemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn"));

        // Xóa mềm
        item.setDeleted(Boolean.TRUE);
        menuItemRepository.save(item);
    }

    public MenuItemResponseDto toItemDto(MenuItemEntity item) {
        String catName = null;
        if (item.getCategory() != null) {
            catName = item.getCategory().getCategoryName();
        } else if (item.getCategoryId() != null) {
            catName = categoryRepository.findById(item.getCategoryId())
                    .map(MenuCategoryEntity::getCategoryName)
                    .orElse(null);
        }

        return new MenuItemResponseDto(
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
    }
}
