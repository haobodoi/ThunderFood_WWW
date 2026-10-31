package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import vn.edu.iuh.fit.thunderfood.enums.ReviewStatusEnum;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Bảng customer_reviews. order_id, customer_id, restaurant_id không đổi sau khi tạo;
 * version do service kiểm tra thủ công dưới khóa dòng, nên không dùng @Version.
 * Ảnh, phản hồi và lịch sử kiểm duyệt nạp theo lô: không fetch join khi phân trang.
 */
@Entity
@Table(name = "customer_reviews")
public class CustomerReviewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long id;

    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", insertable = false, updatable = false)
    private UserEntity customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false, updatable = false)
    private RestaurantEntity restaurant;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReviewStatusEnum status = ReviewStatusEnum.PUBLISHED;

    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @OneToMany(mappedBy = "review")
    @OrderBy("displayOrder ASC")
    @BatchSize(size = 20)
    private List<ReviewImageEntity> images = new ArrayList<>();

    // uq_review_reply giữ tối đa một dòng; dùng List vì @OneToOne phía ngược không lazy được và không nạp theo lô.
    @OneToMany(mappedBy = "review")
    @BatchSize(size = 20)
    private List<ReviewReplyEntity> replies = new ArrayList<>();

    @OneToMany(mappedBy = "review")
    @OrderBy("id DESC")
    @BatchSize(size = 20)
    private List<ReviewModerationLogEntity> moderationLogs = new ArrayList<>();

    protected CustomerReviewEntity() {
    }

    public CustomerReviewEntity(Long orderId, Long customerId, RestaurantEntity restaurant, Integer rating, String content, LocalDateTime now) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.restaurant = restaurant;
        this.rating = rating;
        this.content = content;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void edit(Integer rating, String content, LocalDateTime now) {
        this.rating = rating;
        this.content = content;
        imagesChanged(now);
    }

    /** Thêm/xóa ảnh cũng tính là chỉnh sửa đánh giá. */
    public void imagesChanged(LocalDateTime now) {
        editedAt = now;
        updatedAt = now;
        version++;
    }

    public void softDelete(LocalDateTime now) {
        deletedAt = now;
        updatedAt = now;
        version++;
    }

    public void moderate(ReviewStatusEnum status, LocalDateTime now) {
        this.status = status;
        updatedAt = now;
        version++;
    }

    public Long getId() { return id; }
    public Long getOrderId() { return orderId; }
    public Long getCustomerId() { return customerId; }
    public UserEntity getCustomer() { return customer; }
    public RestaurantEntity getRestaurant() { return restaurant; }
    public Integer getRating() { return rating; }
    public String getContent() { return content; }
    public ReviewStatusEnum getStatus() { return status; }
    public long getVersion() { return version; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getEditedAt() { return editedAt; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public List<ReviewImageEntity> getImages() { return images; }
    public List<ReviewReplyEntity> getReplies() { return replies; }
    public List<ReviewModerationLogEntity> getModerationLogs() { return moderationLogs; }
}
