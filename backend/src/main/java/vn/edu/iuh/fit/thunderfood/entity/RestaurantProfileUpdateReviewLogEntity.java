package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "restaurant_profile_update_review_logs")
public class RestaurantProfileUpdateReviewLogEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "log_id") private Long id;
    @Column(name = "update_id", nullable = false) private Long updateId;
    @Column(name = "admin_id", nullable = false) private Long adminId;
    @Column(name = "decision", nullable = false, length = 16) private String decision;
    @Column(name = "reason", length = 500) private String reason;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected RestaurantProfileUpdateReviewLogEntity() {}
    public RestaurantProfileUpdateReviewLogEntity(long updateId, long adminId, String decision, String reason, LocalDateTime createdAt) {
        this.updateId = updateId; this.adminId = adminId; this.decision = decision; this.reason = reason; this.createdAt = createdAt;
    }
}
