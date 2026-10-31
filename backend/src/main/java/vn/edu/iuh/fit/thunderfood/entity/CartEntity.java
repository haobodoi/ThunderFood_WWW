package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** version do code tự tăng, không dùng @Version: CartService vẫn ghi cột này bằng SQL và so với version client gửi lên. */
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

    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CartItemEntity> items = new ArrayList<>();

    /** Giữ giỏ rỗng và tăng version, để request đến trễ từ tab khác bị từ chối. */
    public void removeItems(Collection<Long> itemIds, LocalDateTime now) {
        items.removeIf(item -> itemIds.contains(item.getId()));
        version++;
        updatedAt = now;
    }

    public Long getId() { return id; }
    public Long getCustomerId() { return customerId; }
    public Long getRestaurantId() { return restaurantId; }
    public Long getVersion() { return version; }
    public List<CartItemEntity> getItems() { return items; }
}
