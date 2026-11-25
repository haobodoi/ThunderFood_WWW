package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.*;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.enums.OrderPaymentStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.PaymentMethodEnum;
import vn.edu.iuh.fit.thunderfood.enums.PaymentRecordStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.OrderRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import static vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum.*;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.text;

/**
 * Luồng đơn: PENDING -> CONFIRMED -> PREPARING -> DELIVERING -> COMPLETED; PENDING -> CANCELLED (khách);
 * PENDING/CONFIRMED -> REJECTED (quán). Đơn VietQR được xác nhận qua SePay hoặc khi quán đối soát.
 */
@Service
@Transactional
public class OrderService {
    private static final String PARTNER_ROLE = "RESTAURANT_PARTNER", CUSTOMER_ROLE = "CUSTOMER";
    private static final int PAGE_SIZE = 10;
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    private static final Map<OrderStatusEnum, OrderStatusEnum> NEXT_STATUS =
            Map.of(CONFIRMED, PREPARING, PREPARING, DELIVERING, DELIVERING, COMPLETED);

    private final OrderRepository orders;
    private final CustomerRules rules;
    private final OrderEvents events;
    private final ApplicationEventPublisher publisher;
    private final OrderPaymentService payments;

    public OrderService(OrderRepository orders, CustomerRules rules, OrderEvents events,
                        ApplicationEventPublisher publisher, OrderPaymentService payments) {
        this.orders = orders;
        this.rules = rules;
        this.events = events;
        this.publisher = publisher;
        this.payments = payments;
    }

    @Transactional(readOnly = true)
    public Optional<SseEmitter> customerStream(long customer) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        return events.subscribe(customer);
    }

    @Transactional(readOnly = true)
    public Optional<SseEmitter> partnerStream(long partner) {
        rules.actor(partner, PARTNER_ROLE, false);
        return events.subscribe(partner);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> mine(long customer, int page) {
        return mine(customer, "ALL", page);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> mine(long customer, String group, int page) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        var pageable = page(page);
        var result = switch (group == null ? "ALL" : group) {
            case "ALL" -> orders.findByCustomerId(customer, pageable);
            case "PROCESSING" -> orders.findByCustomerIdAndOrderStatusIn(customer, List.of(PENDING, CONFIRMED, PREPARING, DELIVERING), pageable);
            case "COMPLETED" -> orders.findByCustomerIdAndOrderStatusIn(customer, List.of(COMPLETED), pageable);
            case "CLOSED" -> orders.findByCustomerIdAndOrderStatusIn(customer, List.of(CANCELLED, REJECTED), pageable);
            default -> throw new BusinessException("Nhóm đơn hàng không hợp lệ");
        };
        return PageResponse.from(result, OrderSummary::from);
    }

    @Transactional(readOnly = true)
    public CustomerOrder get(long customer, long id) {
        rules.actor(customer, CUSTOMER_ROLE, false);
        var order = orders.findByIdAndCustomerId(id, customer)
                .orElseThrow(OrderService::notFound);
        return CustomerOrder.from(order, payments.qr(order));
    }

    public CustomerOrder cancel(long customer, long id, OrderReason request) {
        rules.actor(customer, CUSTOMER_ROLE, true);
        var order = orders.findWithLockByIdAndCustomerId(id, customer)
                .orElseThrow(OrderService::notFound);
        if (order.getOrderStatus() != PENDING || order.getPaymentStatus() != OrderPaymentStatusEnum.UNPAID)
            throw new BusinessException(
                    "Đơn đã được quán tiếp nhận nên không thể tự hủy. Vui lòng liên hệ quán.");
        close(order, CANCELLED, text(request.reason(), 5, 500));
        changed(order);
        return CustomerOrder.from(order, payments.qr(order));
    }

    @Transactional(readOnly = true)
    public PageResponse<PartnerOrder> partnerOrders(long partner, OrderStatusEnum status, boolean refunds, int page) {
        rules.actor(partner, PARTNER_ROLE, false);
        if (refunds) {
            var result = orders.findByRestaurantOwnerUserIdAndOrderStatusInAndPaymentStatus(
                    partner, List.of(CANCELLED, REJECTED), OrderPaymentStatusEnum.PAID, page(page));
            return PageResponse.from(result, PartnerOrder::from);
        }
        var result = status == null
                ? orders.findByRestaurantOwnerUserId(partner, page(page))
                : orders.findByRestaurantOwnerUserIdAndOrderStatus(partner, status, page(page));
        return PageResponse.from(result, PartnerOrder::from);
    }

    public void updateStatus(long partner, long id, OrderStatus request) {
        rules.actor(partner, PARTNER_ROLE, true);
        var order = ownedOrder(partner, id);
        updateStatus(order, request);
    }

    private void updateStatus(OrderEntity order, OrderStatus request) {
        OrderStatusEnum current = order.getOrderStatus(), target = request.status();
        var now = rules.now();
        if (target == REJECTED) {
            if (current != PENDING && current != CONFIRMED)
                throw new BusinessException("Chỉ từ chối được đơn chưa bắt đầu chế biến");
            close(order, REJECTED, text(request.reason(), 5, 500));
        } else if (target == CONFIRMED) {
            if (current != PENDING) throw new BusinessException("Đơn không còn ở trạng thái chờ xác nhận");
            if (order.getPaymentMethod() == PaymentMethodEnum.ONLINE)
                throw new BusinessException("Đơn VietQR cần xác nhận đã nhận tiền trước");
            order.moveTo(CONFIRMED, now);
        } else {
            if (target != NEXT_STATUS.get(current))
                throw new BusinessException("Không thể chuyển đơn sang trạng thái này");
            order.moveTo(target, now);
            // Đơn COD thu tiền lúc giao; đơn VietQR đã PAID trước khi rời PENDING.
            if (target == COMPLETED && order.getPaymentMethod() == PaymentMethodEnum.COD)
                order.settle(OrderPaymentStatusEnum.PAID, PaymentRecordStatusEnum.SUCCESS, "COD", now);
        }
        changed(order);
    }

    public void confirmPayment(long partner, long id) {
        rules.actor(partner, PARTNER_ROLE, true);
        var order = ownedOrder(partner, id);
        payments.confirmManually(order);
    }

    public void refund(long partner, long id) {
        rules.actor(partner, PARTNER_ROLE, true);
        var order = ownedOrder(partner, id);
        refund(order);
    }

    private void refund(OrderEntity order) {
        if (!order.isClosed() || order.getPaymentStatus() != OrderPaymentStatusEnum.PAID)
            throw new BusinessException("Chỉ hoàn tiền được đơn đã thanh toán và đã hủy hoặc bị từ chối");
        order.settle(OrderPaymentStatusEnum.REFUNDED, PaymentRecordStatusEnum.REFUNDED, "MANUAL",
                rules.now());
        changed(order);
    }

    /** Admin uses exactly the partner state machine, with a locked row and stale-screen check. */
    public void administer(long id,
                           String action,
                           OrderStatusEnum expectedStatus,
                           OrderPaymentStatusEnum expectedPayment,
                           OrderStatus request) {
        var order = orders.findWithLockById(id).orElseThrow(OrderService::notFound);
        if (order.getOrderStatus() != expectedStatus || order.getPaymentStatus() != expectedPayment)
            throw new ConcurrentUpdateException();
        switch (action) {
            case "status" -> updateStatus(order, request);
            case "confirm-payment" -> payments.confirmManually(order);
            case "refund" -> refund(order);
            default -> throw new BusinessException("Thao tác đơn hàng không hợp lệ");
        }
        orders.flush();
    }

    private void changed(OrderEntity order) {
        publisher.publishEvent(OrderEvents.OrderChanged.from(order, false));
    }

    /** Đơn đã nhận tiền giữ nguyên PAID để quán còn phải hoàn tiền, không ghi nhận là thanh toán thất bại. */
    private void close(OrderEntity order, OrderStatusEnum status, String reason) {
        var now = rules.now();
        order.close(status, reason, now);
        if (order.getPaymentStatus() == OrderPaymentStatusEnum.UNPAID)
            order.settle(OrderPaymentStatusEnum.FAILED, PaymentRecordStatusEnum.FAILED, status.name(), now);
    }

    private OrderEntity ownedOrder(long partner, long id) {
        return orders.findWithLockByIdAndRestaurantOwnerUserId(id, partner)
                .orElseThrow(OrderService::notFound);
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy đơn hàng");
    }

    private static Pageable page(int page) {
        if (page < 0 || page > 10000) throw new BusinessException("Trang không hợp lệ");
        return PageRequest.of(page, PAGE_SIZE, NEWEST_FIRST);
    }
}
