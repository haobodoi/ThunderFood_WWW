package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.AuthStatusDto;
import vn.edu.iuh.fit.thunderfood.dto.RegisterRequestDto;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.dto.UserResponseDto;
import vn.edu.iuh.fit.thunderfood.service.AuthService;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("headerName", csrfToken.getHeaderName(), "token", csrfToken.getToken());
    }

    @GetMapping("/me")
    public AuthStatusDto me(@AuthenticationPrincipal UserDetailsDto principal, HttpServletRequest request) {
        if (principal == null) {
            return AuthStatusDto.guest();
        }
        return authService.findActiveUser(principal.getId())
                .map(AuthStatusDto::of)
                .orElseGet(() -> {
                    HttpSession session = request.getSession(false);
                    if (session != null) {
                        session.invalidate();
                    }
                    SecurityContextHolder.clearContext();
                    return AuthStatusDto.guest();
                });
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponseDto register(@Valid @RequestBody RegisterRequestDto request) {
        return authService.register(request);
    }
}
