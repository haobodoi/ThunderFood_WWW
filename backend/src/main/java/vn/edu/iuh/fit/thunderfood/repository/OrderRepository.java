package vn.edu.iuh.fit.thunderfood.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;

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
}
