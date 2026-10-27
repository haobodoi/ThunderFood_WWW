package vn.edu.iuh.fit.thunderfood.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.PartnerDashboardResponse;
import vn.edu.iuh.fit.thunderfood.security.CustomUserDetails;
import vn.edu.iuh.fit.thunderfood.service.DashboardService;

@RestController
@RequestMapping("/api/partner")
@PreAuthorize("hasRole('RESTAURANT_PARTNER')")
public class PartnerController {

    private final DashboardService dashboardService;

    public PartnerController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard")
    public PartnerDashboardResponse dashboard(@AuthenticationPrincipal CustomUserDetails principal) {
        return dashboardService.partner(principal.getId());
    }
}
