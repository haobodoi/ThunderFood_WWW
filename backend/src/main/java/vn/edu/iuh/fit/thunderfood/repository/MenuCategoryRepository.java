package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.iuh.fit.thunderfood.entity.MenuCategoryEntity;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategoryEntity, Long> {

    List<MenuCategoryEntity> findByRestaurantIdOrderByDisplayOrderAscIdAsc(Long restaurantId);

    Optional<MenuCategoryEntity> findByIdAndRestaurantId(Long id, Long restaurantId);

    boolean existsByRestaurantIdAndCategoryNameIgnoreCase(Long restaurantId, String categoryName);

    boolean existsByRestaurantIdAndCategoryNameIgnoreCaseAndIdNot(Long restaurantId, String categoryName, Long id);
}
