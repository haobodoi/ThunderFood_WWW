package vn.edu.iuh.fit.thunderfood.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantProfileUpdateEntity;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RestaurantProfileUpdateRepository extends JpaRepository<RestaurantProfileUpdateEntity, Long> {
    Optional<RestaurantProfileUpdateEntity> findFirstByRestaurantIdOrderByIdDesc(Long restaurantId);
    List<RestaurantProfileUpdateEntity> findByStatusOrderBySubmittedAtAsc(String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE) Optional<RestaurantProfileUpdateEntity> findWithLockById(Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RestaurantProfileUpdateEntity r WHERE r.restaurantId = :restaurantId AND r.status IN :statuses ORDER BY r.id DESC")
    List<RestaurantProfileUpdateEntity> findOpenWithLock(@Param("restaurantId") Long restaurantId, @Param("statuses") Collection<String> statuses);
}
