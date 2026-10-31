package vn.edu.iuh.fit.thunderfood.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import vn.edu.iuh.fit.thunderfood.entity.CartEntity;

import java.util.Optional;

public interface CartRepository extends JpaRepository<CartEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CartEntity> findWithLockByIdAndCustomerId(Long id, Long customerId);
}
