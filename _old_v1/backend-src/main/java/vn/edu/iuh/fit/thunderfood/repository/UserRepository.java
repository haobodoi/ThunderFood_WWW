package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.entity.AccountStatus;
import vn.edu.iuh.fit.thunderfood.entity.User;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    long countByRole_RoleCode(String roleCode);

    long countByAccountStatus(AccountStatus accountStatus);

    @Transactional
    @Modifying
    @Query("UPDATE User u SET u.lastLoginAt = :time WHERE u.id = :id")
    int updateLastLoginAt(@Param("id") Long id, @Param("time") LocalDateTime time);
}
