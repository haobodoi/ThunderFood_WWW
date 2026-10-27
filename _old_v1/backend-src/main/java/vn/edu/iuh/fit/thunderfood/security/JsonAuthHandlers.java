package vn.edu.iuh.fit.thunderfood.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Component;
import vn.edu.iuh.fit.thunderfood.dto.ApiError;
import vn.edu.iuh.fit.thunderfood.dto.AuthStatusResponse;
import vn.edu.iuh.fit.thunderfood.dto.UserResponse;
import vn.edu.iuh.fit.thunderfood.entity.User;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;
import vn.edu.iuh.fit.thunderfood.service.AuthService;
import vn.edu.iuh.fit.thunderfood.service.MyUserDetailsService;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;

@Component
public class JsonAuthHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler,
        AuthenticationEntryPoint, AccessDeniedHandler, LogoutSuccessHandler {

    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final MyUserDetailsService userDetailsService;

    public JsonAuthHandlers(ObjectMapper objectMapper,
                            UserRepository userRepository,
                            AuthService authService,
                            MyUserDetailsService userDetailsService) {
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
        this.authService = authService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        userRepository.updateLastLoginAt(principal.getId(), LocalDateTime.now());
        refreshCsrfCookie(request);
        UserResponse user = authService.findActiveUser(principal.getId()).orElseThrow();
        write(response, HttpStatus.OK, AuthStatusResponse.of(user));
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        ApiError error;
        if (exception instanceof LockedException) {
            String reason = userDetailsService.findByLoginIdentifier(request.getParameter("username"))
                    .map(User::getLockReason)
                    .filter(text -> !text.isBlank())
                    .orElse(null);
            String message = reason == null
                    ? "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
                    : "Tài khoản của bạn đã bị khóa. Lý do: " + reason;
            error = ApiError.of("ACCOUNT_LOCKED", message);
        } else if (exception instanceof DisabledException) {
            error = ApiError.of("ACCOUNT_DISABLED", "Tài khoản của bạn đã bị vô hiệu hóa.");
        } else if (exception instanceof BadCredentialsException) {
            error = ApiError.of("BAD_CREDENTIALS", "Email/số điện thoại hoặc mật khẩu không đúng.");
        } else {
            error = ApiError.of("LOGIN_FAILED", "Không thể đăng nhập lúc này, vui lòng thử lại sau.");
        }
        write(response, HttpStatus.UNAUTHORIZED, error);
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        write(response, HttpStatus.UNAUTHORIZED,
                ApiError.of("UNAUTHENTICATED", "Bạn cần đăng nhập để tiếp tục."));
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        if (accessDeniedException instanceof CsrfException) {
            write(response, HttpStatus.FORBIDDEN,
                    ApiError.of("CSRF_INVALID", "Phiên làm việc đã hết hạn, vui lòng thử lại."));
            return;
        }
        write(response, HttpStatus.FORBIDDEN,
                ApiError.of("FORBIDDEN", "Bạn không có quyền truy cập chức năng này."));
    }

    @Override
    public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response,
                                Authentication authentication) throws IOException {
        write(response, HttpStatus.OK, Map.of("message", "Đăng xuất thành công"));
    }

    private void refreshCsrfCookie(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            csrfToken.getToken();
        }
    }

    private void write(HttpServletResponse response, HttpStatus status, Object body) throws IOException {
        response.setStatus(status.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
