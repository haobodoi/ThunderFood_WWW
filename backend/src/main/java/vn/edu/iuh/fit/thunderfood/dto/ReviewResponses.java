package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.entity.CustomerReviewEntity;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.entity.ReviewModerationLogEntity;
import vn.edu.iuh.fit.thunderfood.entity.ReviewReportEntity;
import vn.edu.iuh.fit.thunderfood.repository.CustomerReviewRepository.RatingSummaryView;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Dữ liệu đánh giá rời server chỉ qua các record này: đánh giá công khai không mang customerId/orderId. */
public final class ReviewResponses {
    private ReviewResponses() {}

    public record ReviewImage(long imageId, int displayOrder, String url) {
        static List<ReviewImage> from(CustomerReviewEntity review) {
            return review.getImages().stream().map(image -> new ReviewImage(image.getId(), image.getDisplayOrder(), "/api/restaurants/review-images/" + image.getId())).toList();
        }
    }

    /** Chỉ chứa phản hồi chưa xóa; phản hồi đã xóa mềm chỉ còn thể hiện qua replyVersion. */
    public record ReviewReply(long replyId, String content, long version, LocalDateTime createdAt, LocalDateTime updatedAt) {
        static List<ReviewReply> from(CustomerReviewEntity review) {
            return review.getReplies().stream().filter(reply -> reply.getDeletedAt() == null)
                    .map(reply -> new ReviewReply(reply.getId(), reply.getContent(), reply.getVersion(), reply.getCreatedAt(), reply.getUpdatedAt())).toList();
        }
    }

    /** Version của dòng phản hồi kể cả đã xóa mềm; 0 khi chưa có dòng nào. */
    private static long versionOfReply(CustomerReviewEntity review) {
        return review.getReplies().isEmpty() ? 0 : review.getReplies().getFirst().getVersion();
    }

    public record RatingSummary(long reviewCount, BigDecimal averageRating, long stars1, long stars2, long stars3, long stars4, long stars5) {
        public static RatingSummary from(RatingSummaryView view) {
            return new RatingSummary(view.getReviewCount(), view.getAverageRating(), view.getStars1(), view.getStars2(), view.getStars3(), view.getStars4(), view.getStars5());
        }
        public static RatingSummary empty() { return new RatingSummary(0, null, 0, 0, 0, 0, 0); }
    }

    public record PublicReview(long reviewId, int rating, String content, LocalDateTime createdAt, LocalDateTime editedAt, String authorName,
                               boolean own, List<ReviewImage> images, long replyVersion, List<ReviewReply> replies) {
        public static PublicReview from(CustomerReviewEntity review, Long viewer) {
            return new PublicReview(review.getId(), review.getRating(), review.getContent(), review.getCreatedAt(), review.getEditedAt(), review.getCustomer().getFullName(),
                    review.getCustomerId().equals(viewer), ReviewImage.from(review), versionOfReply(review), ReviewReply.from(review));
        }
    }
    public record PublicReviewPage(List<PublicReview> items, long total, int page, RatingSummary summary) {}

    /** Một dòng trong "Đánh giá của tôi" và "Đánh giá về quán". */
    public record ManagedReview(long reviewId, long restaurantId, String restaurantName, String authorName, int rating, String content, String status, long version,
                                LocalDateTime createdAt, LocalDateTime editedAt, boolean editable, List<ReviewImage> images, long replyVersion, List<ReviewReply> replies) {
        public static ManagedReview from(CustomerReviewEntity review, boolean editable) {
            var restaurant = review.getRestaurant();
            return new ManagedReview(review.getId(), restaurant.getId(), restaurant.getRestaurantName(), review.getCustomer().getFullName(), review.getRating(), review.getContent(), review.getStatus().name(), review.getVersion(),
                    review.getCreatedAt(), review.getEditedAt(), editable, ReviewImage.from(review), versionOfReply(review), ReviewReply.from(review));
        }
    }

    public record EligibleOrder(long orderId, String orderCode, LocalDateTime completedAt) {
        public static EligibleOrder from(OrderEntity order) { return new EligibleOrder(order.getId(), order.getOrderCode(), order.getCompletedAt()); }
    }
    public record Eligibility(List<EligibleOrder> orders, String reason) {}
    public record CreatedReview(long reviewId) {}

    public record ModerationEntry(String fromStatus, String toStatus, String reason, LocalDateTime createdAt) {
        static ModerationEntry from(ReviewModerationLogEntity log) { return new ModerationEntry(log.getFromStatus().name(), log.getToStatus().name(), log.getReason(), log.getCreatedAt()); }
    }

    public record ReportRow(long reportId, long reviewId, long reporterId, String reasonCode, String reason, String status, Long handledBy, LocalDateTime handledAt, String resolutionNote,
                            LocalDateTime createdAt, LocalDateTime updatedAt, String reviewContent, int rating, String reviewStatus, long reviewVersion, LocalDateTime deletedAt,
                            String restaurantName, List<ModerationEntry> history) {
        public static ReportRow from(ReviewReportEntity report) {
            var review = report.getReview();
            return new ReportRow(report.getId(), review.getId(), report.getReporterId(), report.getReasonCode().name(), report.getReason(), report.getStatus().name(), report.getHandledBy(), report.getHandledAt(), report.getResolutionNote(),
                    report.getCreatedAt(), report.getUpdatedAt(), review.getContent(), review.getRating(), review.getStatus().name(), review.getVersion(), review.getDeletedAt(),
                    review.getRestaurant().getRestaurantName(), review.getModerationLogs().stream().map(ModerationEntry::from).toList());
        }
    }
}
