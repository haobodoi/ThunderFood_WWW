package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity order;

    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "item_name", nullable = false, length = 180)
    private String itemName;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;

    @Column(name = "note", length = 500)
    private String note;

    protected OrderItemEntity() {
    }

    public OrderItemEntity(OrderEntity order, Long itemId, String itemName, BigDecimal unitPrice, Integer quantity, BigDecimal lineTotal, String note) {
        this.order = order;
        this.itemId = itemId;
        this.itemName = itemName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.lineTotal = lineTotal;
        this.note = note;
    }

    public Long getId() { return id; }
    public Long getItemId() { return itemId; }
    public String getItemName() { return itemName; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getLineTotal() { return lineTotal; }
    public String getNote() { return note; }
}
