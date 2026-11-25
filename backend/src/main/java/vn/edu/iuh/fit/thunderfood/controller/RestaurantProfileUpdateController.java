package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantProfileUpdateDtos.*;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.service.RestaurantProfileUpdateService;
import java.util.List;

@RestController
public class RestaurantProfileUpdateController {
    private final RestaurantProfileUpdateService service;
    public RestaurantProfileUpdateController(RestaurantProfileUpdateService service) { this.service = service; }
    @GetMapping("/api/partner/restaurants/{id}/profile-update") public Response mine(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id) { return service.mine(user.getId(), id); }
    @PutMapping("/api/partner/restaurants/{id}/profile-update") public Response save(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @Valid @RequestBody Save request) { return service.save(user.getId(), id, request); }
    @PostMapping("/api/partner/restaurants/{id}/profile-update/submit") public Response submit(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @RequestParam long version) { return service.submit(user.getId(), id, version); }
    @GetMapping("/api/admin/restaurant-profile-updates") public List<Response> pending(@AuthenticationPrincipal UserDetailsDto user) { return service.pending(user.getId()); }
    @GetMapping("/api/admin/restaurant-profile-updates/{id}") public Response detail(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id) { return service.adminGet(user.getId(), id); }
    @PostMapping("/api/admin/restaurant-profile-updates/{id}/approve") public Response approve(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id) { return service.approve(user.getId(), id); }
    @PostMapping("/api/admin/restaurant-profile-updates/{id}/reject") public Response reject(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @Valid @RequestBody Reject request) { return service.reject(user.getId(), id, request.reason()); }
}
