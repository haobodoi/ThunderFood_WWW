package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.service.CustomerReviewService;
import vn.edu.iuh.fit.thunderfood.service.ReviewImageService;
import java.util.Map;

@RestController
public class CustomerReviewController {
    private final CustomerReviewService service;
    private final ReviewImageService images;
    public CustomerReviewController(CustomerReviewService service,ReviewImageService images) { this.service=service; this.images=images; }
    @GetMapping("/api/restaurants/{id}/reviews")
    public Map<String,Object> list(@PathVariable long id,@RequestParam(defaultValue="0") int page,@RequestParam(required=false) Integer stars,@RequestParam(defaultValue="false") boolean photos,@RequestParam(defaultValue="newest") String sort,@AuthenticationPrincipal UserDetailsDto user) { return service.list(id,page,stars,photos,sort,user == null ? null : user.getId()); }
    @GetMapping("/api/restaurants/review-images/{id}")
    public ResponseEntity<Resource> image(@PathVariable long id,@AuthenticationPrincipal UserDetailsDto user) {
        return ResponseEntity.ok().header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff").header("Content-Type","image/png").body(images.load(id,user));
    }
    @GetMapping("/api/customer/reviews/eligibility")
    public Map<String,Object> eligibility(@AuthenticationPrincipal UserDetailsDto user,@RequestParam long restaurantId) { return service.eligibility(user.getId(),restaurantId); }
    @GetMapping("/api/customer/reviews")
    public Map<String,Object> own(@AuthenticationPrincipal UserDetailsDto user,@RequestParam(defaultValue="0") int page) { return service.own(user.getId(),"CUSTOMER",page); }
    @PostMapping("/api/customer/reviews")
    public Map<String,Long> create(@AuthenticationPrincipal UserDetailsDto user,@Valid @RequestBody Review request) { return Map.of("reviewId",service.create(user.getId(),request)); }
    @PutMapping("/api/customer/reviews/{id}")
    public void edit(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@Valid @RequestBody EditReview request) { service.edit(user.getId(),id,request); }
    @DeleteMapping("/api/customer/reviews/{id}")
    public void delete(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@RequestParam long version) { service.delete(user.getId(),id,version); }
    @PostMapping("/api/customer/reviews/{id}/images")
    public void upload(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@RequestParam long version,@RequestPart("file") MultipartFile file) { images.upload(user.getId(),id,version,file); }
    @DeleteMapping("/api/customer/reviews/{id}/images/{imageId}")
    public void removeImage(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@PathVariable long imageId,@RequestParam long version) { images.remove(user.getId(),id,imageId,version); }
    @PostMapping("/api/customer/reviews/{id}/reports")
    public void report(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@Valid @RequestBody Report request) { service.report(user.getId(),id,"CUSTOMER",request); }
    @GetMapping("/api/partner/reviews")
    public Map<String,Object> partner(@AuthenticationPrincipal UserDetailsDto user,@RequestParam(defaultValue="0") int page) { return service.own(user.getId(),"RESTAURANT_PARTNER",page); }
    @PutMapping("/api/partner/reviews/{id}/reply")
    public void reply(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@Valid @RequestBody Reply request) { service.reply(user.getId(),id,request,false); }
    @DeleteMapping("/api/partner/reviews/{id}/reply")
    public void deleteReply(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@RequestParam long version) { service.reply(user.getId(),id,new Reply("",version),true); }
    @PostMapping("/api/partner/reviews/{id}/reports")
    public void partnerReport(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@Valid @RequestBody Report request) { service.report(user.getId(),id,"RESTAURANT_PARTNER",request); }
    @GetMapping("/api/admin/review-reports")
    public Map<String,Object> reports(@AuthenticationPrincipal UserDetailsDto user,@RequestParam(defaultValue="0") int page) { return service.reports(user.getId(),page); }
    @PatchMapping("/api/admin/reviews/{id}/visibility")
    public void moderate(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@Valid @RequestBody Moderate request) { service.moderate(user.getId(),id,request); }
    @PatchMapping("/api/admin/review-reports/{id}")
    public void resolve(@AuthenticationPrincipal UserDetailsDto user,@PathVariable long id,@Valid @RequestBody ResolveReport request) { service.resolve(user.getId(),id,request); }
}
