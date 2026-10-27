package vn.edu.iuh.fit.thunderfood.enums;

public enum RestaurantStatusEnum {
    DRAFT,
    PENDING,
    APPROVED,
    REJECTED,
    LOCKED;

    public boolean isEditableByOwner() {
        return this == DRAFT || this == REJECTED;
    }
}
