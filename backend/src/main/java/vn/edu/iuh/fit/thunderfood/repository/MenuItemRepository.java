package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.iuh.fit.thunderfood.entity.MenuItemEntity;
import vn.edu.iuh.fit.thunderfood.enums.ApprovalStatusEnum;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItemEntity, Long> {

    List<MenuItemEntity> findByRestaurantIdAndDeletedFalseOrderByCreatedAtDesc(Long restaurantId);

    List<MenuItemEntity> findByRestaurantIdAndDeletedFalseAndApprovalStatusOrderByCategory_DisplayOrderAscItemNameAsc(
            Long restaurantId, ApprovalStatusEnum approvalStatus);

    Optional<MenuItemEntity> findByIdAndRestaurantIdAndDeletedFalse(Long id, Long restaurantId);

    Optional<MenuItemEntity> findByIdAndDeletedFalse(Long id);

    List<MenuItemEntity> findByCategoryIdAndDeletedFalse(Long categoryId);

    @Modifying
    @Query("UPDATE MenuItemEntity m SET m.categoryId = NULL WHERE m.categoryId = :categoryId")
    void clearCategoryForItems(@Param("categoryId") Long categoryId);

    long countByCategoryIdAndDeletedFalse(Long categoryId);
}
