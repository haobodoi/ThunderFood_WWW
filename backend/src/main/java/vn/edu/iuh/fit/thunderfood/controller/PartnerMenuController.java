package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.thunderfood.dto.*;
import vn.edu.iuh.fit.thunderfood.service.PartnerMenuService;

import java.util.List;

@RestController
@RequestMapping("/api/partner/restaurants/{restaurantId}")
public class PartnerMenuController {

    private final PartnerMenuService partnerMenuService;

    public PartnerMenuController(PartnerMenuService partnerMenuService) {
        this.partnerMenuService = partnerMenuService;
    }

    // ---------- TRẠNG THÁI MỞ / ĐÓNG CỬA ----------
    @PutMapping("/status")
    public RestaurantOpenStatusDto updateOpenStatus(@AuthenticationPrincipal UserDetailsDto principal,
                                                   @PathVariable Long restaurantId,
                                                   @Valid @RequestBody RestaurantOpenStatusDto request) {
        return partnerMenuService.updateOpenStatus(principal.getId(), restaurantId, request.open());
    }

    // ---------- DANH MỤC MÓN ĂN ----------
    @GetMapping("/categories")
    public List<MenuCategoryResponseDto> listCategories(@AuthenticationPrincipal UserDetailsDto principal,
                                                       @PathVariable Long restaurantId) {
        return partnerMenuService.listCategories(principal.getId(), restaurantId);
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public MenuCategoryResponseDto createCategory(@AuthenticationPrincipal UserDetailsDto principal,
                                                 @PathVariable Long restaurantId,
                                                 @Valid @RequestBody MenuCategoryRequestDto request) {
        return partnerMenuService.createCategory(principal.getId(), restaurantId, request);
    }

    @PutMapping("/categories/{categoryId}")
    public MenuCategoryResponseDto updateCategory(@AuthenticationPrincipal UserDetailsDto principal,
                                                 @PathVariable Long restaurantId,
                                                 @PathVariable Long categoryId,
                                                 @Valid @RequestBody MenuCategoryRequestDto request) {
        return partnerMenuService.updateCategory(principal.getId(), restaurantId, categoryId, request);
    }

    @DeleteMapping("/categories/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@AuthenticationPrincipal UserDetailsDto principal,
                               @PathVariable Long restaurantId,
                               @PathVariable Long categoryId) {
        partnerMenuService.deleteCategory(principal.getId(), restaurantId, categoryId);
    }

    // ---------- MÓN ĂN ----------
    @GetMapping("/items")
    public List<MenuItemResponseDto> listItems(@AuthenticationPrincipal UserDetailsDto principal,
                                               @PathVariable Long restaurantId) {
        return partnerMenuService.listItems(principal.getId(), restaurantId);
    }

    @GetMapping("/items/{itemId}")
    public MenuItemResponseDto getItem(@AuthenticationPrincipal UserDetailsDto principal,
                                       @PathVariable Long restaurantId,
                                       @PathVariable Long itemId) {
        return partnerMenuService.getItem(principal.getId(), restaurantId, itemId);
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public MenuItemResponseDto createItem(@AuthenticationPrincipal UserDetailsDto principal,
                                          @PathVariable Long restaurantId,
                                          @Valid @RequestBody MenuItemRequestDto request) {
        return partnerMenuService.createItem(principal.getId(), restaurantId, request);
    }

    @PutMapping("/items/{itemId}")
    public MenuItemResponseDto updateItem(@AuthenticationPrincipal UserDetailsDto principal,
                                          @PathVariable Long restaurantId,
                                          @PathVariable Long itemId,
                                          @Valid @RequestBody MenuItemRequestDto request) {
        return partnerMenuService.updateItem(principal.getId(), restaurantId, itemId, request);
    }

    @PatchMapping("/items/{itemId}/availability")
    public MenuItemResponseDto toggleAvailability(@AuthenticationPrincipal UserDetailsDto principal,
                                                  @PathVariable Long restaurantId,
                                                  @PathVariable Long itemId,
                                                  @RequestParam(required = false) Boolean available) {
        return partnerMenuService.toggleAvailability(principal.getId(), restaurantId, itemId, available);
    }

    @DeleteMapping("/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@AuthenticationPrincipal UserDetailsDto principal,
                           @PathVariable Long restaurantId,
                           @PathVariable Long itemId) {
        partnerMenuService.deleteItem(principal.getId(), restaurantId, itemId);
    }
}
