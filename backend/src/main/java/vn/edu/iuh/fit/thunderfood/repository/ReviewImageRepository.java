package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.iuh.fit.thunderfood.entity.ReviewImageEntity;

import java.util.Optional;

public interface ReviewImageRepository extends JpaRepository<ReviewImageEntity, Long> {

    Optional<ReviewImageEntity> findByIdAndReviewId(Long id, Long reviewId);

    @EntityGraph(attributePaths = {"review", "review.restaurant"})
    Optional<ReviewImageEntity> findWithReviewById(Long id);
}
