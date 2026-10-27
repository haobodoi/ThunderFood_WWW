package vn.edu.iuh.fit.thunderfood.dto;

import java.time.LocalDateTime;

public record CustomerDashboardResponse(String fullName, String address, LocalDateTime memberSince) {
}
