package vn.edu.iuh.fit.thunderfood.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** items và payments nạp theo lô bằng @BatchSize: fetch join một-nhiều sẽ khiến phân trang chạy trong bộ nhớ. */
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    Optional<OrderEntity> findByIdAndCustomerId(Long id, Long customerId);

    @EntityGraph(attributePaths = "restaurant")
    Page<OrderEntity> findByCustomerId(Long customerId, Pageable pageable);

    @EntityGraph(attributePaths = "restaurant")
    Page<OrderEntity> findByRestaurantOwnerUserId(Long ownerUserId, Pageable pageable);

    @EntityGraph(attributePaths = "restaurant")
    Page<OrderEntity> findByRestaurantOwnerUserIdAndOrderStatus(Long ownerUserId, OrderStatusEnum status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OrderEntity> findWithLockByIdAndCustomerId(Long id, Long customerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OrderEntity> findWithLockByIdAndRestaurantOwnerUserId(Long id, Long ownerUserId);

    /** Đơn còn được đánh giá: đã hoàn tất trong khoảng thời gian, khách không phải chủ quán, chưa có đánh giá kể cả đã xóa mềm. */
    @Query("SELECT o FROM OrderEntity o WHERE o.customerId = :customerId AND o.restaurant.id = :restaurantId AND o.restaurant.ownerUserId <> :customerId " +
            "AND o.orderStatus = COMPLETED AND o.completedAt >= :from AND o.completedAt <= :to " +
            "AND NOT EXISTS (SELECT 1 FROM CustomerReviewEntity v WHERE v.orderId = o.id) ORDER BY o.completedAt DESC, o.id DESC")
    List<OrderEntity> findReviewable(@Param("customerId") Long customerId, @Param("restaurantId") Long restaurantId, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
