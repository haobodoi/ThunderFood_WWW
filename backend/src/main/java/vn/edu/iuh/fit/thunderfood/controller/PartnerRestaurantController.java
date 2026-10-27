package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantBankDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantBasicDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantDetailsDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantRegistrationDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantRepresentativeDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantSummaryDto;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.service.RestaurantRegistrationService;

import java.util.List;

@RestController
@RequestMapping("/api/partner/restaurants")
public class PartnerRestaurantController {

    private final RestaurantRegistrationService registrationService;

    public PartnerRestaurantController(RestaurantRegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @GetMapping
    public List<RestaurantSummaryDto> list(@AuthenticationPrincipal UserDetailsDto principal) {
        return registrationService.listMine(principal.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RestaurantRegistrationDto create(@AuthenticationPrincipal UserDetailsDto principal,
                                            @Valid @RequestBody RestaurantBasicDto request) {
        return registrationService.create(principal.getId(), request);
    }

    @GetMapping("/{id}")
    public RestaurantRegistrationDto get(@AuthenticationPrincipal UserDetailsDto principal, @PathVariable Long id) {
        return registrationService.getMine(principal.getId(), id);
    }

    @PutMapping("/{id}/basic")
    public RestaurantRegistrationDto updateBasic(@AuthenticationPrincipal UserDetailsDto principal,
                                                 @PathVariable Long id,
                                                 @Valid @RequestBody RestaurantBasicDto request) {
        return registrationService.updateBasic(principal.getId(), id, request);
    }

    @PutMapping("/{id}/representative")
    public RestaurantRegistrationDto updateRepresentative(@AuthenticationPrincipal UserDetailsDto principal,
                                                          @PathVariable Long id,
                                                          @Valid @RequestBody RestaurantRepresentativeDto request) {
        return registrationService.updateRepresentative(principal.getId(), id, request);
    }

    @PutMapping("/{id}/bank")
    public RestaurantRegistrationDto updateBank(@AuthenticationPrincipal UserDetailsDto principal,
                                                @PathVariable Long id,
                                                @Valid @RequestBody RestaurantBankDto request) {
        return registrationService.updateBank(principal.getId(), id, request);
    }

    @PutMapping("/{id}/details")
    public RestaurantRegistrationDto updateDetails(@AuthenticationPrincipal UserDetailsDto principal,
                                                   @PathVariable Long id,
                                                   @Valid @RequestBody RestaurantDetailsDto request) {
        return registrationService.updateDetails(principal.getId(), id, request);
    }

    @PostMapping("/{id}/submit")
    public RestaurantRegistrationDto submit(@AuthenticationPrincipal UserDetailsDto principal, @PathVariable Long id) {
        return registrationService.submit(principal.getId(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetailsDto principal, @PathVariable Long id) {
        registrationService.deleteDraft(principal.getId(), id);
    }
}
