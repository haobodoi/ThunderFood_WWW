package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.*;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.service.OrderService;

@RestController
public class OrderController {
    private final OrderService service;
    public OrderController(OrderService service) { this.service = service; }

    @GetMapping("/api/customer/orders/events") public SseEmitter customerEvents(@AuthenticationPrincipal UserDetailsDto user, HttpServletResponse response) { noProxyBuffering(response); return service.customerStream(user.getId()); }
    @GetMapping("/api/partner/orders/events") public SseEmitter partnerEvents(@AuthenticationPrincipal UserDetailsDto user, HttpServletResponse response) { noProxyBuffering(response); return service.partnerStream(user.getId()); }
    /** Nginx giữ phản hồi trong bộ đệm nếu không có header này, sự kiện sẽ đến trễ. */
    private static void noProxyBuffering(HttpServletResponse response) { response.setHeader("X-Accel-Buffering", "no"); }

    @GetMapping("/api/customer/orders/checkout") public CheckoutPreview preview(@AuthenticationPrincipal UserDetailsDto user, @RequestParam long cartId) { return service.preview(user.getId(), cartId); }
    @PostMapping("/api/customer/orders") @ResponseStatus(HttpStatus.CREATED) public CustomerOrder checkout(@AuthenticationPrincipal UserDetailsDto user, @Valid @RequestBody Checkout request) { return service.checkout(user.getId(), request); }
    @GetMapping("/api/customer/orders") public PageResponse<OrderSummary> mine(@AuthenticationPrincipal UserDetailsDto user, @RequestParam(defaultValue = "0") int page) { return service.mine(user.getId(), page); }
    @GetMapping("/api/customer/orders/{id}") public CustomerOrder get(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id) { return service.get(user.getId(), id); }
    @PostMapping("/api/customer/orders/{id}/cancel") public CustomerOrder cancel(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @Valid @RequestBody OrderReason request) { return service.cancel(user.getId(), id, request); }

    @GetMapping("/api/partner/orders") public PageResponse<PartnerOrder> partnerOrders(@AuthenticationPrincipal UserDetailsDto user, @RequestParam(required = false) String status, @RequestParam(defaultValue = "0") int page) { return service.partnerOrders(user.getId(), status, page); }
    @PatchMapping("/api/partner/orders/{id}/status") public void updateStatus(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @Valid @RequestBody OrderStatus request) { service.updateStatus(user.getId(), id, request); }
    @PostMapping("/api/partner/orders/{id}/confirm-payment") public void confirmPayment(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id) { service.confirmPayment(user.getId(), id); }
    @PostMapping("/api/partner/orders/{id}/refund") public void refund(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id) { service.refund(user.getId(), id); }
}
