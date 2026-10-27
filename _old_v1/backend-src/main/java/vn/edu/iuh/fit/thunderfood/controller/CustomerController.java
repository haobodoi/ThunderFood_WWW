package vn.edu.iuh.fit.thunderfood.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.CustomerDashboardResponse;
import vn.edu.iuh.fit.thunderfood.security.CustomUserDetails;
import vn.edu.iuh.fit.thunderfood.service.DashboardService;

@RestController
@RequestMapping("/api/customer")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerController {

    private final DashboardService dashboardService;

    public CustomerController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard")
    public CustomerDashboardResponse dashboard(@AuthenticationPrincipal CustomUserDetails principal) {
        return dashboardService.customer(principal.getId());
    }
}
