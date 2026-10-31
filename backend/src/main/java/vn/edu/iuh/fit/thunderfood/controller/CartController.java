package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.thunderfood.dto.CartResponses.CartResponse;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.service.CartService;
import java.util.List;

@RestController
@RequestMapping("/api/customer/carts")
public class CartController {
    private final CartService service;
    public CartController(CartService service) { this.service = service; }
    @GetMapping public List<CartResponse> list(@AuthenticationPrincipal UserDetailsDto user) { return service.list(user.getId()); }
    @GetMapping("/{id}") public CartResponse get(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id) { return service.get(user.getId(), id); }
    @PostMapping("/items") public CartResponse add(@AuthenticationPrincipal UserDetailsDto user, @Valid @RequestBody AddItem request) { return service.add(user.getId(), request); }
    @PutMapping("/{id}/items/{line}") public CartResponse change(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @PathVariable long line, @Valid @RequestBody ChangeItem request) { return service.change(user.getId(), id, line, request); }
    @DeleteMapping("/{id}/items/{line}") public CartResponse remove(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @PathVariable long line, @RequestParam long version) { return service.remove(user.getId(), id, line, version); }
    @DeleteMapping("/{id}") public CartResponse clear(@AuthenticationPrincipal UserDetailsDto user, @PathVariable long id, @RequestParam long version) { return service.remove(user.getId(), id, null, version); }
}
