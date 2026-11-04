package vn.edu.iuh.fit.thunderfood.controller;

import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.PageResponse;
import vn.edu.iuh.fit.thunderfood.service.AdminQueryService;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/partner/statistics")
public class PartnerStatisticsController {
    private final AdminQueryService statistics;
    public PartnerStatisticsController(AdminQueryService statistics) { this.statistics=statistics; }

    @GetMapping("/dashboard")
    public Map<String,Object> dashboard(@AuthenticationPrincipal UserDetailsDto user,
            @RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,
            @RequestParam(defaultValue="day") String group,@RequestParam(required=false) Long restaurantId) {
        return statistics.partnerDashboard(user.getId(),restaurantId,statistics.range(from,to),group);
    }
    @GetMapping("/dashboard/export")
    public ResponseEntity<String> export(@AuthenticationPrincipal UserDetailsDto user,
            @RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,
            @RequestParam(defaultValue="day") String group,@RequestParam(required=false) Long restaurantId) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=thunderfood-partner-report.csv")
                .header(HttpHeaders.CACHE_CONTROL,"no-store")
                .body(statistics.partnerCsv(user.getId(),restaurantId,statistics.range(from,to),group));
    }
    @GetMapping("/restaurants")
    public PageResponse<Map<String,Object>> restaurants(@AuthenticationPrincipal UserDetailsDto user,
            @RequestParam(defaultValue="") String q,@RequestParam(defaultValue="0") int page) {
        return statistics.partnerRestaurants(user.getId(),q,page);
    }
}
