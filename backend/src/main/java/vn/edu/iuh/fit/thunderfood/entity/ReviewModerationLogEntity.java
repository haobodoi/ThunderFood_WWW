package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import vn.edu.iuh.fit.thunderfood.enums.ReviewStatusEnum;

import java.time.LocalDateTime;

/** Bảng review_moderation_logs: chỉ ghi thêm, @Immutable để Hibernate không bao giờ sinh UPDATE. */
@Entity
@Immutable
@Table(name = "review_moderation_logs")
public class ReviewModerationLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false, updatable = false)
    private CustomerReviewEntity review;

    @Column(name = "admin_id", nullable = false, updatable = false)
    private Long adminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false, updatable = false)
    private ReviewStatusEnum fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, updatable = false)
    private ReviewStatusEnum toStatus;

    @Column(name = "reason", nullable = false, length = 500, updatable = false)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ReviewModerationLogEntity() {
    }

    public ReviewModerationLogEntity(CustomerReviewEntity review, Long adminId, ReviewStatusEnum fromStatus, ReviewStatusEnum toStatus, String reason, LocalDateTime now) {
        this.review = review;
        this.adminId = adminId;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.reason = reason;
        this.createdAt = now;
    }

    public ReviewStatusEnum getFromStatus() { return fromStatus; }
    public ReviewStatusEnum getToStatus() { return toStatus; }
    public String getReason() { return reason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
