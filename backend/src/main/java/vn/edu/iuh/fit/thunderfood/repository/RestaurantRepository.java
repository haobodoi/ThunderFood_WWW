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
}
