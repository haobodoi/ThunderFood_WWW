package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.thunderfood.dto.*;
import vn.edu.iuh.fit.thunderfood.dto.AdminRequests.*;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.PageResponse;
import vn.edu.iuh.fit.thunderfood.enums.UploadKindEnum;
import vn.edu.iuh.fit.thunderfood.service.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminQueryService query;
    private final AdminManagementService manage;
    private final FileStorageService files;

    public AdminController(AdminQueryService query, AdminManagementService manage, FileStorageService files) {
        this.query = query;
        this.manage = manage;
        this.files = files;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to, @RequestParam(defaultValue = "day") String group) {
        return query.dashboard(query.range(from, to), group);
    }

    @GetMapping("/dashboard/export")
    public ResponseEntity<String> export(@RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to, @RequestParam(defaultValue = "day") String group) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=thunderfood-report.csv").body(query.csv(query.range(from, to), group));
    }

    @GetMapping("/orders")
    public PageResponse<Map<String, Object>> orders(@RequestParam(defaultValue = "") String q, @RequestParam(required = false) String status, @RequestParam(required = false) String payment, @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to, @RequestParam(required = false) Long customer, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "newest") String sort) {
        return query.orders(q, status, payment, from, to, customer, page, sort);
    }

    @GetMapping("/orders/{id}")
    public Map<String, Object> order(@PathVariable long id) {
        return query.order(id);
    }

    @PostMapping("/orders/{id}/{action:status|confirm-payment|refund}")
    public void action(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @PathVariable String action, @Valid @RequestBody OrderAction request) {
        manage.order(user.getId(), id, action, request);
    }

    @PostMapping("/orders/{id}/notes")
    public void note(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @Valid @RequestBody Note request) {
        manage.note(user.getId(), id, request.reason());
    }

    @GetMapping("/users")
    public PageResponse<Map<String, Object>> users(@RequestParam(defaultValue = "") String q, @RequestParam(required = false) String role, @RequestParam(required = false) String status, @RequestParam(defaultValue = "0") int page) {
        return query.users(q, role, status, page);
    }

    @GetMapping("/users/{id}")
    public Map<String, Object> user(@PathVariable long id) {
        return query.user(id);
    }

    @GetMapping("/restaurant-reviews")
    public PageResponse<Map<String, Object>> restaurantReviews(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "PENDING") String status, @RequestParam(defaultValue = "0") int page) {
        return query.restaurantReviews(q, status, page);
    }

    @PatchMapping("/users/{id}/access")
    public void access(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @Valid @RequestBody UserAccess request) {
        manage.access(user.getId(), id, request);
    }

    @PostMapping("/users/staff")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> staff(@AuthenticationPrincipal UserDetailsDto user, @Valid @RequestBody Staff request) {
        return Map.of("id", manage.staff(user.getId(), request));
    }

    @GetMapping("/catalog/restaurants")
    public PageResponse<Map<String, Object>> restaurants(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "0") int page) {
        return query.restaurants(q, page);
    }

    @GetMapping("/catalog/{restaurant}/{kind:items|categories}")
    public PageResponse<Map<String, Object>> catalog(@PathVariable long restaurant, @PathVariable String kind, @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "0") int page, @RequestParam(required = false) String status, @RequestParam(required = false) Long category, @RequestParam(defaultValue = "newest") String sort) {
        return query.catalog(kind, restaurant, q, page, status, category, sort);
    }

    @PostMapping("/catalog/{restaurant}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public Object createItem(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long restaurant, @Valid @RequestBody MenuItemRequestDto request) {
        return manage.item(user.getId(), restaurant, null, request);
    }

    @PutMapping("/catalog/{restaurant}/items/{id}")
    public Object item(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long restaurant, @PathVariable long id, @Valid @RequestBody MenuItemRequestDto request) {
        return manage.item(user.getId(), restaurant, id, request);
    }

    @DeleteMapping("/catalog/{restaurant}/items/{id}")
    public void deleteItem(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long restaurant, @PathVariable long id) {
        manage.removeItem(user.getId(), restaurant, id);
    }

    @PatchMapping("/catalog/{restaurant}/items/{id}/visibility")
    public void itemVisible(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long restaurant, @PathVariable long id, @Valid @RequestBody Visibility request) {
        manage.itemVisible(user.getId(), restaurant, id, request.visible());
    }

    @PostMapping("/catalog/{restaurant}/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public Object createCategory(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long restaurant, @Valid @RequestBody MenuCategoryRequestDto request) {
        return manage.category(user.getId(), restaurant, null, request);
    }

    @PutMapping("/catalog/{restaurant}/categories/{id}")
    public Object category(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long restaurant, @PathVariable long id, @Valid @RequestBody MenuCategoryRequestDto request) {
        return manage.category(user.getId(), restaurant, id, request);
    }

    @DeleteMapping("/catalog/{restaurant}/categories/{id}")
    public void deleteCategory(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long restaurant, @PathVariable long id) {
        manage.removeCategory(user.getId(), restaurant, id);
    }

    @PatchMapping("/catalog/{restaurant}/categories/{id}/visibility")
    public void categoryVisible(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long restaurant, @PathVariable long id, @Valid @RequestBody Visibility request) {
        manage.categoryVisible(user.getId(), restaurant, id, request.visible());
    }

    @PostMapping(value = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResultDto upload(@AuthenticationPrincipal UserDetailsDto user, @RequestPart("file") MultipartFile file) {
        return new UploadResultDto(files.store(user.getId(), UploadKindEnum.FOOD_IMAGE, file));
    }

    @PutMapping("/stores/{id}")
    public void store(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @Valid @RequestBody Store request) {
        manage.store(user.getId(), id, request);
    }

    @GetMapping("/activity")
    public PageResponse<Map<String, Object>> logs(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "0") int page) {
        return query.logs(q, page);
    }

    @GetMapping("/complaints")
    public PageResponse<Map<String, Object>> complaints(@RequestParam(required = false) String status, @RequestParam(defaultValue = "0") int page) {
        return query.complaints(status, page);
    }

    @PatchMapping("/complaints/{id}")
    public void complaint(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @Valid @RequestBody Complaint request) {
        manage.complaint(user.getId(), id, request);
    }
}
