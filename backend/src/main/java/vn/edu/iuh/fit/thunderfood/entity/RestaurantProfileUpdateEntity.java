package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "restaurant_profile_updates")
public class RestaurantProfileUpdateEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "update_id") private Long id;
    @Column(name = "restaurant_id", nullable = false) private Long restaurantId;
    @Column(name = "owner_user_id", nullable = false) private Long ownerUserId;
    @Column(name = "status", nullable = false, length = 16) private String status;
    @Lob @Column(name = "profile_json", nullable = false, columnDefinition = "LONGTEXT") private String profileJson;
    @Column(name = "status_reason", length = 500) private String statusReason;
    @Column(name = "version", nullable = false) private long version;
    @Column(name = "submitted_at") private LocalDateTime submittedAt;
    @Column(name = "reviewed_by") private Long reviewedBy;
    @Column(name = "reviewed_at") private LocalDateTime reviewedAt;
    @Column(name = "created_at", insertable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false) private LocalDateTime updatedAt;

    protected RestaurantProfileUpdateEntity() {}
    public RestaurantProfileUpdateEntity(long restaurantId, long ownerUserId, String profileJson) {
        this.restaurantId = restaurantId; this.ownerUserId = ownerUserId; this.profileJson = profileJson; this.status = "DRAFT";
    }
    public Long getId() { return id; }
    public Long getRestaurantId() { return restaurantId; }
    public Long getOwnerUserId() { return ownerUserId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getProfileJson() { return profileJson; }
    public void setProfileJson(String profileJson) { this.profileJson = profileJson; }
    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }
    public long getVersion() { return version; }
    public void bumpVersion() { version++; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public Long getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(Long reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
