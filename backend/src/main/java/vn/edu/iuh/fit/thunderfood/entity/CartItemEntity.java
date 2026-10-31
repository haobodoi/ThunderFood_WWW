package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cart_items")
public class CartItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cart_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cart_id", nullable = false)
    private CartEntity cart;

    @Column(name = "restaurant_id", nullable = false)
    private Long restaurantId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", insertable = false, updatable = false)
    private MenuItemEntity item;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "note", nullable = false, length = 300)
    private String note;

    @Column(name = "last_seen_unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal lastSeenUnitPrice;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    protected CartItemEntity() {
    }

    CartItemEntity(CartEntity cart, MenuItemEntity item, int quantity, String note) {
        this.cart = cart;
        this.restaurantId = cart.getRestaurantId();
        this.itemId = item.getId();
        this.item = item;
        this.quantity = quantity;
        this.note = note;
        this.lastSeenUnitPrice = item.getPrice();
    }

    /** Khách vừa thao tác trên dòng này nên mốc giá tham chiếu được cập nhật theo giá hiện tại. */
    public void change(int quantity, String note, BigDecimal price) {
        this.quantity = quantity;
        this.note = note;
        this.lastSeenUnitPrice = price;
    }

    public void merge(int extraQuantity, BigDecimal price) {
        change(quantity + extraQuantity, note, price);
    }

    public Long getId() { return id; }
    public Long getItemId() { return itemId; }
    public MenuItemEntity getItem() { return item; }
    public Integer getQuantity() { return quantity; }
    public String getNote() { return note; }
    public BigDecimal getLastSeenUnitPrice() { return lastSeenUnitPrice; }
}
