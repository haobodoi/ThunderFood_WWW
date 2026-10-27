package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.iuh.fit.thunderfood.entity.Restaurant;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantStatus;

import java.util.Optional;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    Optional<Restaurant> findByOwnerUserId(Long ownerUserId);

    long countByStatus(RestaurantStatus status);
}
