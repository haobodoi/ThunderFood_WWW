package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import vn.edu.iuh.fit.thunderfood.enums.PaymentRecordStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class PaymentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity order;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Column(name = "transaction_code", length = 190)
    private String transactionCode;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private PaymentRecordStatusEnum status = PaymentRecordStatusEnum.PENDING;

    @Column(name = "response_code", length = 50)
    private String responseCode;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected PaymentEntity() {
    }

    public PaymentEntity(OrderEntity order, String provider, String transactionCode, BigDecimal amount, LocalDateTime createdAt) {
        this.order = order;
        this.provider = provider;
        this.transactionCode = transactionCode;
        this.amount = amount;
        this.createdAt = createdAt;
    }

    public String getTransactionCode() { return transactionCode; }

    /** Chỉ ghi paidAt khi thanh toán thành công, để hoàn tiền không làm mất thời điểm đã trả. */
    public void record(PaymentRecordStatusEnum status, String responseCode, LocalDateTime now) {
        this.status = status;
        this.responseCode = responseCode;
        if (status == PaymentRecordStatusEnum.SUCCESS) this.paidAt = now;
    }
}
