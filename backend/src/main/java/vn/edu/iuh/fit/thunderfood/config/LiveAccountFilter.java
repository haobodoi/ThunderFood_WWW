package vn.edu.iuh.fit.thunderfood.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.enums.AccountStatusEnum;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;
import java.io.IOException;

/** Revoke existing sessions immediately after an account is locked or its role changes. */
public class LiveAccountFilter extends OncePerRequestFilter {
    private final UserRepository users;
    public LiveAccountFilter(UserRepository users) { this.users = users; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsDto principal) {
            var user = users.findById(principal.getId());
            if (user.isEmpty() || user.get().getAccountStatus() != AccountStatusEnum.ACTIVE || !user.get().getRole().getRoleCode().equals(principal.getRoleCode())) {
                SecurityContextHolder.clearContext();
                var session = request.getSession(false);
                if (session != null) session.invalidate();
                response.setStatus(401);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"code\":\"SESSION_REVOKED\",\"message\":\"Tài khoản hoặc quyền truy cập đã thay đổi. Vui lòng đăng nhập lại.\"}");
                return;
            }
        }
        if (request.getRequestURI().startsWith(request.getContextPath() + "/api/admin/") || request.getRequestURI().startsWith(request.getContextPath() + "/api/partner/statistics/")) response.setHeader("Cache-Control", "no-store");
        chain.doFilter(request, response);
    }
}
