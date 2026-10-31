package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Bảng review_images. uq_review_image_slot: mỗi slot 1..5 chỉ có một ảnh trong một đánh giá. */
@Entity
@Table(name = "review_images")
public class ReviewImageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false, updatable = false)
    private CustomerReviewEntity review;

    @Column(name = "file_key", nullable = false, length = 500, updatable = false)
    private String fileKey;

    @Column(name = "display_order", nullable = false, updatable = false)
    private Integer displayOrder;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ReviewImageEntity() {
    }

    public ReviewImageEntity(CustomerReviewEntity review, String fileKey, Integer displayOrder) {
        this.review = review;
        this.fileKey = fileKey;
        this.displayOrder = displayOrder;
    }

    public Long getId() { return id; }
    public CustomerReviewEntity getReview() { return review; }
    public String getFileKey() { return fileKey; }
    public Integer getDisplayOrder() { return displayOrder; }
}
