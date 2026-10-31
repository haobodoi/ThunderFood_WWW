package vn.edu.iuh.fit.thunderfood.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    /** Chỉ lấy id quán, không nạp entity: lockedItem sau đó vẫn đọc được giá trị mới nhất của món. */
    @Query("SELECT m.restaurantId FROM MenuItemEntity m WHERE m.id = :id")
    Optional<Long> findRestaurantIdById(@Param("id") Long id);

    /** FOR UPDATE khóa cả dòng món lẫn dòng quán nhờ phép join. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MenuItemEntity m JOIN FETCH m.restaurant WHERE m.id = :id")
    Optional<MenuItemEntity> findWithLockById(@Param("id") Long id);
}
