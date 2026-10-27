package vn.edu.iuh.fit.thunderfood.dto;

public record AdminDashboardResponse(
        long totalCustomers,
        long totalPartners,
        long pendingRestaurants,
        long lockedAccounts
) {
}
