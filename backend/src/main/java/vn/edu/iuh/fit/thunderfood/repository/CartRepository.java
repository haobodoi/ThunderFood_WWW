package vn.edu.iuh.fit.thunderfood.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.iuh.fit.thunderfood.entity.CartEntity;

import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<CartEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CartEntity> findWithLockByIdAndCustomerId(Long id, Long customerId);

    /** Đọc thường, không khóa: FOR UPDATE trên dòng chưa tồn tại sẽ giữ gap lock và hai khách cùng tạo giỏ đầu tiên có thể deadlock. */
    @Query("SELECT c.id FROM CartEntity c WHERE c.customerId = :customerId AND c.restaurantId = :restaurantId")
    Optional<Long> findIdByCustomerIdAndRestaurantId(@Param("customerId") Long customerId, @Param("restaurantId") Long restaurantId);

    @EntityGraph(attributePaths = {"restaurant", "items", "items.item"})
    Optional<CartEntity> findDetailedByIdAndCustomerId(Long id, Long customerId);

    @EntityGraph(attributePaths = {"restaurant", "items", "items.item"})
    List<CartEntity> findDetailedByCustomerIdOrderByUpdatedAtDescIdDesc(Long customerId);
}
