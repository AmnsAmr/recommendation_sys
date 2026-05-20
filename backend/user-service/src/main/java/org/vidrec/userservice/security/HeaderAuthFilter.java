package org.vidrec.userservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.vidrec.userservice.user.UserRole;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class HeaderAuthFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-User-Id";
    private static final String ROLE_HEADER = "X-User-Role";
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";
    private static final Set<String> PUBLIC_PATHS = Set.of(
        "/users/register",
        "/users/login",
        "/actuator/health",
        "/actuator/info"
    );

    private final String internalServiceToken;

    public HeaderAuthFilter(@Value("${INTERNAL_SERVICE_TOKEN}") String internalServiceToken) {
        this.internalServiceToken = internalServiceToken;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "/actuator/health".equals(path) || "/actuator/info".equals(path);
    }

    private boolean isPublicPath(String path) {
        if (path == null) return false;
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String path = request.getRequestURI();

        // Allow public paths to proceed without gateway token validation
        if (isPublicPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!isTrustedGatewayRequest(request)) {
            log.warn("Unauthorized request to protected path: {} (Missing or invalid X-Internal-Token)", path);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        AuthContext authContext = extractAuthContext(request);
        if (authContext == null || authContext.userId() == null || authContext.userId().isBlank()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            authContext.userId(),
            null,
            List.of(new SimpleGrantedAuthority("ROLE_" + authContext.role().name()))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        filterChain.doFilter(request, response);
    }

    private AuthContext extractAuthContext(HttpServletRequest request) {
        String userIdHeader = request.getHeader(HEADER);
        if (StringUtils.hasText(userIdHeader)) {
            String roleHeader = request.getHeader(ROLE_HEADER);
            UserRole role = UserRole.USER;
            if (StringUtils.hasText(roleHeader)) {
                try {
                    role = UserRole.valueOf(roleHeader.trim().toUpperCase());
                } catch (IllegalArgumentException ignored) {
                    return null;
                }
            }
            return new AuthContext(userIdHeader, role);
        }

        return null;
    }

    private boolean isTrustedGatewayRequest(HttpServletRequest request) {
        String internalToken = request.getHeader(INTERNAL_TOKEN_HEADER);
        return StringUtils.hasText(internalToken) && internalServiceToken.equals(internalToken);
    }

    private record AuthContext(String userId, UserRole role) {}
}
