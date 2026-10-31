package vn.edu.iuh.fit.thunderfood.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import vn.edu.iuh.fit.thunderfood.entity.ReviewReportEntity;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ReviewReportRepository extends JpaRepository<ReviewReportEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ReviewReportEntity> findWithLockById(Long id);

    long countByReporterIdAndCreatedAtGreaterThanEqual(Long reporterId, LocalDateTime from);

    /** Báo cáo chưa xử lý lên trước; lịch sử kiểm duyệt của từng đánh giá nạp theo lô. */
    @EntityGraph(attributePaths = {"review", "review.restaurant"})
    @Query(value = "SELECT p FROM ReviewReportEntity p ORDER BY CASE WHEN p.status = OPEN THEN 0 WHEN p.status = PROCESSING THEN 1 ELSE 2 END, p.createdAt DESC, p.id DESC",
            countQuery = "SELECT COUNT(p) FROM ReviewReportEntity p")
    Page<ReviewReportEntity> findQueue(Pageable pageable);
}
