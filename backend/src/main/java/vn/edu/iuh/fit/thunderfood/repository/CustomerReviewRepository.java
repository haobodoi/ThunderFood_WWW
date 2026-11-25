package vn.edu.iuh.fit.thunderfood.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.iuh.fit.thunderfood.entity.CustomerReviewEntity;
import vn.edu.iuh.fit.thunderfood.enums.ReviewStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

/** Ảnh và phản hồi nạp theo lô bằng @BatchSize; các truy vấn phân trang chỉ fetch quan hệ một-một. */
public interface CustomerReviewRepository extends JpaRepository<CustomerReviewEntity, Long> {

    /** Dòng tổng hợp từ view restaurant_rating_summary; view không có dòng khi quán chưa có đánh giá công khai. */
    interface RatingSummaryView {
        Long getReviewCount();
        BigDecimal getAverageRating();
        Long getStars1();
        Long getStars2();
        Long getStars3();
        Long getStars4();
        Long getStars5();
    }

    interface RestaurantRatingView extends RatingSummaryView {
        Long getRestaurantId();
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CustomerReviewEntity> findWithLockById(Long id);

    // Đếm cả đánh giá đã xóa mềm: mỗi đơn chỉ được đánh giá một lần.
    boolean existsByOrderId(Long orderId);

    @EntityGraph(attributePaths = {"customer", "restaurant"})
    Optional<CustomerReviewEntity> findByOrderIdAndCustomerId(Long orderId, Long customerId);

    long countByCustomerIdAndCreatedAtGreaterThanEqual(Long customerId, LocalDateTime from);

    @EntityGraph(attributePaths = "customer")
    @Query(
            "SELECT r FROM CustomerReviewEntity r WHERE r.restaurant.id = :restaurantId AND r.status = PUBLISHED AND r.deletedAt IS NULL " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:photos = FALSE OR EXISTS (SELECT 1 FROM ReviewImageEntity i WHERE i.review = r)) " +
            "AND (:itemId IS NULL OR EXISTS (SELECT 1 FROM OrderItemEntity i WHERE i.order.id = r.orderId AND i.itemId = :itemId))")
    Page<CustomerReviewEntity> findPublic(@Param("restaurantId") Long restaurantId,
                                          @Param("rating") Integer rating,
                                          @Param("photos") boolean photos,
                                          @Param("itemId") Long itemId,
                                          Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "restaurant"})
    Page<CustomerReviewEntity> findByCustomerIdAndDeletedAtIsNull(Long customerId, Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "restaurant"})
    Page<CustomerReviewEntity> findByRestaurantOwnerUserIdAndStatusAndDeletedAtIsNull(Long ownerUserId,
                                                                                      ReviewStatusEnum status,
                                                                                      Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "restaurant"})
    @Query("SELECT r FROM CustomerReviewEntity r WHERE r.restaurant.ownerUserId = :ownerUserId AND r.status = PUBLISHED AND r.deletedAt IS NULL " +
            "AND (:replyStatus = 'ALL' OR (:replyStatus = 'REPLIED' AND EXISTS (SELECT 1 FROM ReviewReplyEntity q WHERE q.review = r AND q.deletedAt IS NULL)) " +
            "OR (:replyStatus = 'UNREPLIED' AND NOT EXISTS (SELECT 1 FROM ReviewReplyEntity q WHERE q.review = r AND q.deletedAt IS NULL)))")
    Page<CustomerReviewEntity> findPartnerReviews(@Param("ownerUserId") Long ownerUserId,
                                                  @Param("replyStatus") String replyStatus,
                                                  Pageable pageable);

    @Query(value =
            "SELECT review_count AS reviewCount, average_rating AS averageRating, stars_1 AS stars1, stars_2 AS stars2, " +
            "stars_3 AS stars3, stars_4 AS stars4, stars_5 AS stars5 FROM restaurant_rating_summary WHERE restaurant_id = :restaurantId",
            nativeQuery = true)
    Optional<RatingSummaryView> findRatingSummary(@Param("restaurantId") Long restaurantId);

    @Query(value = """
            SELECT COUNT(*) AS reviewCount, AVG(r.rating) AS averageRating,
              SUM(r.rating = 1) AS stars1, SUM(r.rating = 2) AS stars2, SUM(r.rating = 3) AS stars3,
              SUM(r.rating = 4) AS stars4, SUM(r.rating = 5) AS stars5
            FROM customer_reviews r
            WHERE r.restaurant_id = :restaurantId AND r.status = 'PUBLISHED' AND r.deleted_at IS NULL
              AND (:itemId IS NULL OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = r.order_id AND oi.item_id = :itemId))
            """, nativeQuery = true)
    RatingSummaryView findFilteredRatingSummary(@Param("restaurantId") Long restaurantId, @Param("itemId") Long itemId);

    @Query(value =
            "SELECT restaurant_id AS restaurantId, review_count AS reviewCount, average_rating AS averageRating, " +
            "stars_1 AS stars1, stars_2 AS stars2, stars_3 AS stars3, stars_4 AS stars4, stars_5 AS stars5 " +
            "FROM restaurant_rating_summary WHERE restaurant_id IN (:restaurantIds)", nativeQuery = true)
    java.util.List<RestaurantRatingView> findRatingSummaries(@Param("restaurantIds") java.util.Collection<Long> restaurantIds);
}
