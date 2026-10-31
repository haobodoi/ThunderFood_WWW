package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** version do CartEntity tự tăng và được so với version client gửi lên dưới khóa bi quan, nên không dùng @Version: @Version chỉ so với giá trị đọc trong cùng transaction. */
@Entity
@Table(name = "carts")
public class CartEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cart_id")
    private Long id;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @Column(name = "restaurant_id", nullable = false, updatable = false)
    private Long restaurantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id", insertable = false, updatable = false)
    private RestaurantEntity restaurant;

    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<CartItemEntity> items = new ArrayList<>();

    protected CartEntity() {
    }

    public CartEntity(Long customerId, RestaurantEntity restaurant, LocalDateTime now) {
        this.customerId = customerId;
        this.restaurantId = restaurant.getId();
        this.restaurant = restaurant;
        this.updatedAt = now;
    }

    public void addItem(MenuItemEntity item, int quantity, String note) {
        items.add(new CartItemEntity(this, item, quantity, note));
    }

    /** Mọi thay đổi trên dòng món đều phải gọi để request cũ từ tab khác nhận 409. */
    public void touch(LocalDateTime now) {
        version++;
        updatedAt = now;
    }

    /** Giữ giỏ rỗng và tăng version, để request đến trễ từ tab khác bị từ chối. */
    public void removeItems(Collection<Long> itemIds, LocalDateTime now) {
        items.removeIf(item -> itemIds.contains(item.getId()));
        touch(now);
    }

    public Long getId() { return id; }
    public Long getCustomerId() { return customerId; }
    public Long getRestaurantId() { return restaurantId; }
    public RestaurantEntity getRestaurant() { return restaurant; }
    public Long getVersion() { return version; }
    public List<CartItemEntity> getItems() { return items; }
}
