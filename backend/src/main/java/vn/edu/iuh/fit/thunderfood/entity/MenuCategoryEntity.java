package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "menu_categories",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_category_name", columnNames = {"restaurant_id", "category_name"})
        }
)
public class MenuCategoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long id;

    @Column(name = "restaurant_id", nullable = false)
    private Long restaurantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id", insertable = false, updatable = false)
    private RestaurantEntity restaurant;

    @Column(name = "category_name", nullable = false, length = 120)
    private String categoryName;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    public MenuCategoryEntity() {
    }

    public MenuCategoryEntity(Long restaurantId, String categoryName, Integer displayOrder) {
        this.restaurantId = restaurantId;
        this.categoryName = categoryName;
        this.displayOrder = displayOrder != null ? displayOrder : 0;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRestaurantId() {
        return restaurantId;
    }

    public void setRestaurantId(Long restaurantId) {
        this.restaurantId = restaurantId;
    }

    public RestaurantEntity getRestaurant() {
        return restaurant;
    }

    public void setRestaurant(RestaurantEntity restaurant) {
        this.restaurant = restaurant;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }
}
