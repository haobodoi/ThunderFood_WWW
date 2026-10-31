package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.iuh.fit.thunderfood.entity.ReviewModerationLogEntity;

public interface ReviewModerationLogRepository extends JpaRepository<ReviewModerationLogEntity, Long> {
}
