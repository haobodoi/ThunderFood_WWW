package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.iuh.fit.thunderfood.entity.OpeningHourEntity;

import java.util.List;

public interface OpeningHourRepository extends JpaRepository<OpeningHourEntity, Long> {

    List<OpeningHourEntity> findByRestaurantIdAndDayOfWeek(Long restaurantId, Integer dayOfWeek);
}
