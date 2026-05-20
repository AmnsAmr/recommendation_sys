package org.vidrec.videoservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class HeaderAuthFilter extends OncePerRequestFilter {

    private static final String HEADER_USER_ID = "X-User-Id";
    private static final String HEADER_USER_ROLE = "X-User-Role";
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    @Value("${INTERNAL_SERVICE_TOKEN}")
    private String internalServiceToken;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "/actuator/health".equals(path) || "/actuator/info".equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        // Allow public paths to proceed without gateway token validation
        if (isPublicRoute(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!isTrustedGatewayRequest(request)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        AuthContext authContext = extractAuthContext(request);
        if (authContext == null || !StringUtils.hasText(authContext.userId())) {
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
        String userIdHeader = request.getHeader(HEADER_USER_ID);
        if (StringUtils.hasText(userIdHeader)) {
            String roleHeader = request.getHeader(HEADER_USER_ROLE);
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

    private boolean isPublicRoute(HttpServletRequest request) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return false;
        }

        String path = request.getRequestURI();
        return path.startsWith("/videos/catalog")
            || path.startsWith("/videos/search")
            || path.matches("^/videos/[^/]+$")
            || path.startsWith("/videos/user/");
    }

    private boolean isTrustedGatewayRequest(HttpServletRequest request) {
        String internalToken = request.getHeader(INTERNAL_TOKEN_HEADER);
        return StringUtils.hasText(internalToken) && internalServiceToken.equals(internalToken);
    }

    private record AuthContext(String userId, UserRole role) {}
}
