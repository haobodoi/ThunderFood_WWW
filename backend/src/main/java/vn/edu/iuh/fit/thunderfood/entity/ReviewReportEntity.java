package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import vn.edu.iuh.fit.thunderfood.enums.ReviewReportReasonEnum;
import vn.edu.iuh.fit.thunderfood.enums.ReviewReportStatusEnum;

import java.time.LocalDateTime;

/** Bảng review_reports. uq_review_reporter: mỗi người chỉ báo cáo một đánh giá một lần. */
@Entity
@Table(name = "review_reports")
public class ReviewReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false, updatable = false)
    private CustomerReviewEntity review;

    @Column(name = "reporter_id", nullable = false, updatable = false)
    private Long reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false, updatable = false)
    private ReviewReportReasonEnum reasonCode;

    @Column(name = "reason", nullable = false, length = 500, updatable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReviewReportStatusEnum status = ReviewReportStatusEnum.OPEN;

    @Column(name = "handled_by")
    private Long handledBy;

    @Column(name = "handled_at")
    private LocalDateTime handledAt;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    // DB tự cập nhật qua ON UPDATE CURRENT_TIMESTAMP.
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    protected ReviewReportEntity() {
    }

    public ReviewReportEntity(CustomerReviewEntity review, Long reporterId, ReviewReportReasonEnum reasonCode, String reason) {
        this.review = review;
        this.reporterId = reporterId;
        this.reasonCode = reasonCode;
        this.reason = reason;
    }

    public void resolve(ReviewReportStatusEnum status, Long admin, String note, LocalDateTime now) {
        this.status = status;
        this.handledBy = admin;
        this.handledAt = now;
        this.resolutionNote = note;
    }

    public Long getId() { return id; }
    public CustomerReviewEntity getReview() { return review; }
    public Long getReporterId() { return reporterId; }
    public ReviewReportReasonEnum getReasonCode() { return reasonCode; }
    public String getReason() { return reason; }
    public ReviewReportStatusEnum getStatus() { return status; }
    public Long getHandledBy() { return handledBy; }
    public LocalDateTime getHandledAt() { return handledAt; }
    public String getResolutionNote() { return resolutionNote; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
