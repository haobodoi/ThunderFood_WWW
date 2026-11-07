package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import vn.edu.iuh.fit.thunderfood.entity.MenuItemEntity;
import vn.edu.iuh.fit.thunderfood.enums.ApprovalStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** Truy vấn chỉ đọc phục vụ trợ lý ảo: tìm món đang bán trên toàn hệ thống và thống kê món được đặt nhiều. */
public interface AssistantQueryRepository extends Repository<MenuItemEntity, Long> {

    @Query("SELECT m FROM MenuItemEntity m JOIN FETCH m.restaurant r LEFT JOIN m.category c " +
            "WHERE m.deleted = false AND m.available = true AND m.approvalStatus = :approved AND r.status = :active " +
            "AND (m.categoryId IS NULL OR c.visible = true) " +
            "AND (:keyword IS NULL OR LOWER(m.itemName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(m.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:maxPrice IS NULL OR m.price <= :maxPrice) " +
            "ORDER BY m.price ASC, m.id ASC")
    List<MenuItemEntity> searchDishes(@Param("approved") ApprovalStatusEnum approved,
                                      @Param("active") RestaurantStatusEnum active,
                                      @Param("keyword") String keyword,
                                      @Param("maxPrice") BigDecimal maxPrice,
                                      Pageable page);

    /** Mỗi dòng: itemId, itemName, restaurantId, restaurantName, tổng số phần đã đặt. */
    @Query("SELECT i.itemId, i.itemName, r.id, r.restaurantName, SUM(i.quantity) " +
            "FROM OrderItemEntity i JOIN i.order o JOIN o.restaurant r " +
            "WHERE o.createdAt >= :from AND o.orderStatus NOT IN :excluded AND i.itemId IS NOT NULL " +
            "GROUP BY i.itemId, i.itemName, r.id, r.restaurantName " +
            "ORDER BY SUM(i.quantity) DESC")
    List<Object[]> popularDishes(@Param("from") LocalDateTime from,
                                 @Param("excluded") Collection<OrderStatusEnum> excluded,
                                 Pageable page);
}
