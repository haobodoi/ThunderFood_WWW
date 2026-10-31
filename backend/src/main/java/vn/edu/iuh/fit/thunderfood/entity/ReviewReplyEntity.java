package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Bảng review_replies. Xóa mềm giữ nguyên content (NOT NULL) và tăng version để khôi phục trên cùng dòng. */
@Entity
@Table(name = "review_replies")
public class ReviewReplyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reply_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false, updatable = false)
    private CustomerReviewEntity review;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    protected ReviewReplyEntity() {
    }

    public ReviewReplyEntity(CustomerReviewEntity review, Long partnerId, String content) {
        this.review = review;
        this.partnerId = partnerId;
        this.content = content;
        this.version = 1;
    }

    /** Cũng là thao tác khôi phục khi phản hồi đang bị xóa mềm. */
    public void write(Long partnerId, String content, LocalDateTime now) {
        this.content = content;
        this.deletedAt = null;
        changed(partnerId, now);
    }

    public void softDelete(Long partnerId, LocalDateTime now) {
        this.deletedAt = now;
        changed(partnerId, now);
    }

    private void changed(Long partnerId, LocalDateTime now) {
        this.partnerId = partnerId;
        this.updatedAt = now;
        this.version++;
    }

    public Long getId() { return id; }
    public String getContent() { return content; }
    public long getVersion() { return version; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
}
