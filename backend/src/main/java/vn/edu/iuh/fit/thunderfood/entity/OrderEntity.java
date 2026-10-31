package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import vn.edu.iuh.fit.thunderfood.enums.OrderPaymentStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.PaymentMethodEnum;
import vn.edu.iuh.fit.thunderfood.enums.PaymentRecordStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Long id;

    @Column(name = "order_code", nullable = false, length = 32, updatable = false)
    private String orderCode;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false, updatable = false)
    private RestaurantEntity restaurant;

    @Column(name = "recipient_name", nullable = false, length = 120)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false, length = 15)
    private String recipientPhone;

    @Column(name = "delivery_address", nullable = false, length = 500)
    private String deliveryAddress;

    @Column(name = "note", length = 1000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_status", nullable = false)
    private OrderStatusEnum orderStatus = OrderStatusEnum.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, updatable = false)
    private PaymentMethodEnum paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private OrderPaymentStatusEnum paymentStatus = OrderPaymentStatusEnum.UNPAID;

    @Column(name = "subtotal", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal subtotal;

    @Column(name = "delivery_fee", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal deliveryFee;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal totalAmount;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @BatchSize(size = 20)
    private List<OrderItemEntity> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 20)
    private List<PaymentEntity> payments = new ArrayList<>();

    protected OrderEntity() {
    }

    public OrderEntity(String orderCode, Long customerId, RestaurantEntity restaurant, String recipientName, String recipientPhone, String deliveryAddress, String note,
                       PaymentMethodEnum paymentMethod, BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal totalAmount, LocalDateTime now) {
        this.orderCode = orderCode;
        this.customerId = customerId;
        this.restaurant = restaurant;
        this.recipientName = recipientName;
        this.recipientPhone = recipientPhone;
        this.deliveryAddress = deliveryAddress;
        this.note = note;
        this.paymentMethod = paymentMethod;
        this.subtotal = subtotal;
        this.deliveryFee = deliveryFee;
        this.totalAmount = totalAmount;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void addItem(Long itemId, String itemName, BigDecimal unitPrice, Integer quantity, BigDecimal lineTotal, String note) {
        items.add(new OrderItemEntity(this, itemId, itemName, unitPrice, quantity, lineTotal, note));
    }

    public void addPayment(String provider, String transactionCode, LocalDateTime now) {
        payments.add(new PaymentEntity(this, provider, transactionCode, totalAmount, now));
    }

    public void moveTo(OrderStatusEnum status, LocalDateTime now) {
        orderStatus = status;
        updatedAt = now;
        if (status == OrderStatusEnum.CONFIRMED) confirmedAt = now;
        if (status == OrderStatusEnum.COMPLETED) completedAt = now;
    }

    public void close(OrderStatusEnum status, String reason, LocalDateTime now) {
        orderStatus = status;
        cancelReason = reason;
        cancelledAt = now;
        updatedAt = now;
    }

    public void settle(OrderPaymentStatusEnum orderPayment, PaymentRecordStatusEnum record, String responseCode, LocalDateTime now) {
        paymentStatus = orderPayment;
        updatedAt = now;
        payments.forEach(payment -> payment.record(record, responseCode, now));
    }

    public Long getId() { return id; }
    public String getOrderCode() { return orderCode; }
    public Long getCustomerId() { return customerId; }
    public RestaurantEntity getRestaurant() { return restaurant; }
    public String getRecipientName() { return recipientName; }
    public String getRecipientPhone() { return recipientPhone; }
    public String getDeliveryAddress() { return deliveryAddress; }
    public String getNote() { return note; }
    public OrderStatusEnum getOrderStatus() { return orderStatus; }
    public PaymentMethodEnum getPaymentMethod() { return paymentMethod; }
    public OrderPaymentStatusEnum getPaymentStatus() { return paymentStatus; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getCancelReason() { return cancelReason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public List<OrderItemEntity> getItems() { return items; }
    public List<PaymentEntity> getPayments() { return payments; }
}
