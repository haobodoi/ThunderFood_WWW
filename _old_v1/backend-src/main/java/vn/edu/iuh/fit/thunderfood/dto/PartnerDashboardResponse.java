package vn.edu.iuh.fit.thunderfood.dto;

public record PartnerDashboardResponse(
        boolean hasRestaurant,
        Long restaurantId,
        String restaurantName,
        String status,
        String statusReason,
        boolean open
) {
    public static PartnerDashboardResponse empty() {
        return new PartnerDashboardResponse(false, null, null, null, null, false);
    }
}
