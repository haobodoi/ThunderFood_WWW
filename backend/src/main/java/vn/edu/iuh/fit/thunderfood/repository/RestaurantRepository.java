package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RestaurantRepository extends JpaRepository<RestaurantEntity, Long> {

    List<RestaurantEntity> findByOwnerUserIdOrderByIdDesc(Long ownerUserId);

    Optional<RestaurantEntity> findByIdAndOwnerUserId(Long id, Long ownerUserId);

    List<RestaurantEntity> findByStatusOrderBySubmittedAtAsc(RestaurantStatusEnum status);

    Optional<RestaurantEntity> findByIdAndStatusIn(Long id, Collection<RestaurantStatusEnum> statuses);

    long countByStatus(RestaurantStatusEnum status);

    @org.springframework.data.jpa.repository.Query("SELECT r FROM RestaurantEntity r " +
            "WHERE r.status = :status " +
            "AND (:province IS NULL OR :province = '' OR r.province = :province) " +
            "AND (:keyword IS NULL OR :keyword = '' OR LOWER(r.restaurantName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(r.specialty) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "ORDER BY r.open DESC, r.id DESC")
    List<RestaurantEntity> searchApprovedRestaurants(@org.springframework.data.repository.query.Param("status") RestaurantStatusEnum status,
                                                    @org.springframework.data.repository.query.Param("keyword") String keyword,
                                                    @org.springframework.data.repository.query.Param("province") String province);
}
