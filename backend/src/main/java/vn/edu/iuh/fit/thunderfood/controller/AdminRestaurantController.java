package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.RejectRequestDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantRegistrationDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantSummaryDto;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.service.RestaurantReviewService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/restaurants")
public class AdminRestaurantController {

    private final RestaurantReviewService reviewService;

    public AdminRestaurantController(RestaurantReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public List<RestaurantSummaryDto> list(@RequestParam(required = false) RestaurantStatusEnum status) {
        return reviewService.list(status);
    }

    @GetMapping("/{id}")
    public RestaurantRegistrationDto get(@PathVariable Long id) {
        return reviewService.get(id);
    }

    @PostMapping("/{id}/approve")
    public RestaurantRegistrationDto approve(@AuthenticationPrincipal UserDetailsDto principal, @PathVariable Long id) {
        return reviewService.approve(principal.getId(), id);
    }

    @PostMapping("/{id}/reject")
    public RestaurantRegistrationDto reject(@AuthenticationPrincipal UserDetailsDto principal,
                                            @PathVariable Long id,
                                            @Valid @RequestBody RejectRequestDto request) {
        return reviewService.reject(principal.getId(), id, request.reason());
    }
}
