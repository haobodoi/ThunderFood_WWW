package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.PageResponse;
import vn.edu.iuh.fit.thunderfood.dto.ReviewResponses.*;
import vn.edu.iuh.fit.thunderfood.entity.CustomerReviewEntity;
import vn.edu.iuh.fit.thunderfood.entity.ReviewModerationLogEntity;
import vn.edu.iuh.fit.thunderfood.entity.ReviewReplyEntity;
import vn.edu.iuh.fit.thunderfood.entity.ReviewReportEntity;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.ReviewReportReasonEnum;
import vn.edu.iuh.fit.thunderfood.enums.ReviewReportStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.ReviewStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.CustomerReviewRepository;
import vn.edu.iuh.fit.thunderfood.repository.OrderRepository;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;
import vn.edu.iuh.fit.thunderfood.repository.ReviewModerationLogRepository;
import vn.edu.iuh.fit.thunderfood.repository.ReviewReplyRepository;
import vn.edu.iuh.fit.thunderfood.repository.ReviewReportRepository;

import java.time.LocalDateTime;
import java.util.Set;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.*;

@Service
@Transactional
public class CustomerReviewService {
    private static final String CUSTOMER_ROLE = "CUSTOMER", PARTNER_ROLE = "RESTAURANT_PARTNER", ADMIN_ROLE = "ADMIN";
    private static final int PAGE_SIZE = 10;
    /** Sắp xếp ổn định theo created_at + review_id; các cách sắp xếp khác chỉ thêm tiêu chí ở đầu. */
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final CustomerReviewRepository reviews;
    private final ReviewReplyRepository replies;
    private final ReviewReportRepository reports;
    private final ReviewModerationLogRepository logs;
    private final OrderRepository orders;
    private final RestaurantRepository restaurants;
    private final CustomerRules rules;
    public CustomerReviewService(CustomerReviewRepository reviews, ReviewReplyRepository replies, ReviewReportRepository reports, ReviewModerationLogRepository logs, OrderRepository orders, RestaurantRepository restaurants, CustomerRules rules) {
        this.reviews = reviews; this.replies = replies; this.reports = reports; this.logs = logs; this.orders = orders; this.restaurants = restaurants; this.rules = rules;
    }

    private static ResourceNotFoundException missing() { return new ResourceNotFoundException("Không tìm thấy dữ liệu"); }
    /** Khóa dòng đánh giá để kiểm tra version và ghi trong cùng transaction. */
    public CustomerReviewEntity locked(long id) { return reviews.findWithLockById(id).orElseThrow(CustomerReviewService::missing); }
    private void publicRestaurant(long id) { restaurants.findByIdAndStatusIn(id, Set.of(RestaurantStatusEnum.APPROVED)).orElseThrow(CustomerReviewService::missing); }
    private void ownerAlive(long customer, CustomerReviewEntity review) {
        if (review.getCustomerId() != customer || review.getDeletedAt() != null) throw new ResourceNotFoundException("Không tìm thấy đánh giá");
    }
    private boolean withinEditWindow(LocalDateTime createdAt) { return !rules.now().isAfter(createdAt.plusDays(7)); }
    public void editable(long customer, CustomerReviewEntity review) {
        ownerAlive(customer, review);
        if (!withinEditWindow(review.getCreatedAt())) throw new BusinessException("Chỉ được sửa đánh giá trong 7 ngày sau khi gửi");
    }
    private void page(int page) { if (page < 0 || page > 10000) throw new BusinessException("Trang không hợp lệ"); }
    private static <E extends Enum<E>> E parse(Class<E> type, String value) {
        for (E constant : type.getEnumConstants()) if (constant.name().equals(value)) return constant;
        return null;
    }

    @Transactional(readOnly = true)
    public PublicReviewPage list(long restaurant, int page, Integer stars, boolean photos, String sort, Long viewer) {
        publicRestaurant(restaurant); page(page);
        if (stars != null && (stars < 1 || stars > 5)) throw new BusinessException("Số sao không hợp lệ");
        Sort order = switch (sort) {
            case "highest" -> Sort.by(Sort.Order.desc("rating")).and(NEWEST_FIRST);
            case "lowest" -> Sort.by(Sort.Order.asc("rating")).and(NEWEST_FIRST);
            case "newest" -> NEWEST_FIRST;
            default -> throw new BusinessException("Cách sắp xếp không hợp lệ");
        };
        var rows = reviews.findPublic(restaurant, stars, photos, PageRequest.of(page, PAGE_SIZE, order));
        var summary = reviews.findRatingSummary(restaurant).map(RatingSummary::from).orElseGet(RatingSummary::empty);
        return new PublicReviewPage(rows.getContent().stream().map(review -> PublicReview.from(review, viewer)).toList(), rows.getTotalElements(), page, summary);
    }
    @Transactional(readOnly = true)
    public Eligibility eligibility(long customer, long restaurant) {
        rules.actor(customer, CUSTOMER_ROLE, false); publicRestaurant(restaurant);
        var now = rules.now();
        var rows = orders.findReviewable(customer, restaurant, now.minusDays(30), now).stream().map(EligibleOrder::from).toList();
        return new Eligibility(rows, rows.isEmpty() ? "Bạn cần đơn đã hoàn tất trong 30 ngày và chưa đánh giá để viết đánh giá." : "");
    }
    public CreatedReview create(long customer, Review request) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        var order = orders.findWithLockByIdAndCustomerId(request.orderId(), customer).orElseThrow(CustomerReviewService::missing);
        var restaurant = order.getRestaurant();
        var completed = order.getCompletedAt();
        var now = rules.now();
        if (order.getOrderStatus() != OrderStatusEnum.COMPLETED || completed == null || completed.isAfter(now) || completed.isBefore(now.minusDays(30)) || restaurant.getOwnerUserId() == customer || restaurant.getStatus() != RestaurantStatusEnum.APPROVED)
            throw new BusinessException("Đơn hàng không đủ điều kiện đánh giá");
        if (reviews.existsByOrderId(request.orderId())) throw new BusinessException("Đơn này đã được đánh giá");
        if (reviews.countByCustomerIdAndCreatedAtGreaterThanEqual(customer, now.minusDays(1)) >= 10)
            throw new BusinessException("Bạn đã đạt giới hạn 10 đánh giá trong 24 giờ");
        var review = reviews.save(new CustomerReviewEntity(request.orderId(), customer, restaurant, request.rating(), text(request.content(), 10, 1000), now));
        return new CreatedReview(review.getId());
    }
    public void edit(long customer, long id, EditReview request) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        var row = locked(id);
        editable(customer, row); version(row.getVersion(), request.version());
        row.edit(request.rating(), text(request.content(), 10, 1000), rules.now());
    }
    public void delete(long customer, long id, long expected) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        var row = locked(id);
        ownerAlive(customer, row);
        version(row.getVersion(), expected);
        row.softDelete(rules.now());
    }
    @Transactional(readOnly = true)
    public PageResponse<ManagedReview> own(long actor, String role, int page) {
        rules.actor(actor, role, false); page(page);
        var pageable = PageRequest.of(page, PAGE_SIZE, NEWEST_FIRST);
        boolean customer = CUSTOMER_ROLE.equals(role);
        var rows = customer ? reviews.findByCustomerIdAndDeletedAtIsNull(actor, pageable)
                : reviews.findByRestaurantOwnerUserIdAndStatusAndDeletedAtIsNull(actor, ReviewStatusEnum.PUBLISHED, pageable);
        return PageResponse.from(rows, review -> ManagedReview.from(review, customer && withinEditWindow(review.getCreatedAt())));
    }
    public void reply(long partner, long id, Reply request, boolean delete) {
        rules.actor(partner, PARTNER_ROLE, true);
        var row = locked(id);
        if (row.getRestaurant().getOwnerUserId() != partner) throw missing();
        if (row.getDeletedAt() != null || row.getStatus() != ReviewStatusEnum.PUBLISHED) throw new BusinessException("Đánh giá hiện không công khai");
        var existing = replies.findWithLockByReviewId(id);
        if (existing.isEmpty()) {
            if (delete) throw new BusinessException("Chưa có phản hồi");
            if (request.version() != 0) throw new ConcurrentUpdateException();
            replies.save(new ReviewReplyEntity(row, partner, text(request.content(), 1, 1000)));
        } else {
            var current = existing.get();
            version(current.getVersion(), request.version());
            if (delete) current.softDelete(partner, rules.now());
            else current.write(partner, text(request.content(), 1, 1000), rules.now());
        }
    }
    public void report(long actor, long id, String role, Report request) {
        rules.actor(actor, role, true);
        var reasonCode = parse(ReviewReportReasonEnum.class, request.reasonCode());
        if (reasonCode == null) throw new BusinessException("Lý do báo cáo không hợp lệ");
        var row = locked(id);
        if (row.getDeletedAt() != null || row.getStatus() != ReviewStatusEnum.PUBLISHED || row.getCustomerId() == actor) throw new BusinessException("Không thể báo cáo đánh giá này");
        if (reports.countByReporterIdAndCreatedAtGreaterThanEqual(actor, rules.now().minusDays(1)) >= 10) throw new BusinessException("Tối đa 10 báo cáo trong 24 giờ");
        // Báo cáo trùng do uq_review_reporter chặn: DataIntegrityViolationException thành 409 ở GlobalExceptionHandler.
        reports.save(new ReviewReportEntity(row, actor, reasonCode, text(request.reason(), 5, 500)));
    }
    @Transactional(readOnly = true)
    public PageResponse<ReportRow> reports(long admin, int page) {
        rules.actor(admin, ADMIN_ROLE, false); page(page);
        return PageResponse.from(reports.findQueue(PageRequest.of(page, PAGE_SIZE)), ReportRow::from);
    }
    public void moderate(long admin, long id, Moderate request) {
        rules.actor(admin, ADMIN_ROLE, true);
        var row = locked(id);
        version(row.getVersion(), request.version());
        var target = parse(ReviewStatusEnum.class, request.status());
        if (target == null || target == row.getStatus()) throw new BusinessException("Trạng thái không thay đổi hoặc không hợp lệ");
        if (row.getDeletedAt() != null) throw new BusinessException("Không thể khôi phục đánh giá khách đã xóa");
        var now = rules.now();
        logs.save(new ReviewModerationLogEntity(row, admin, row.getStatus(), target, text(request.reason(), 5, 500), now));
        row.moderate(target, now);
    }
    public void resolve(long admin, long id, ResolveReport request) {
        rules.actor(admin, ADMIN_ROLE, true);
        var row = reports.findWithLockById(id).orElseThrow(CustomerReviewService::missing);
        var target = parse(ReviewReportStatusEnum.class, request.status());
        boolean closing = target == ReviewReportStatusEnum.RESOLVED || target == ReviewReportStatusEnum.REJECTED;
        boolean open = row.getStatus() == ReviewReportStatusEnum.OPEN || row.getStatus() == ReviewReportStatusEnum.PROCESSING;
        if (!closing || !open) throw new BusinessException("Báo cáo đã xử lý hoặc trạng thái không hợp lệ");
        row.resolve(target, admin, text(request.note(), 1, 500), rules.now());
    }
}
