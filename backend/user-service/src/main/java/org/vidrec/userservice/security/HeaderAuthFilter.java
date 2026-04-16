package org.vidrec.userservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.vidrec.userservice.user.UserRole;

@Component
public class HeaderAuthFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-User-Id";
    private static final String ROLE_HEADER = "X-User-Role";
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final Set<String> PUBLIC_PATHS = Set.of(
        "/users/register",
        "/users/login",
        "/actuator/health",
        "/actuator/info"
    );

    private final JwtUtil jwtUtil;

    public HeaderAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return PUBLIC_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
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
        String authorization = request.getHeader(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(authorization) && authorization.startsWith(BEARER_PREFIX)) {
            String token = authorization.substring(BEARER_PREFIX.length()).trim();
            if (StringUtils.hasText(token)) {
                try {
                    UUID userId = jwtUtil.extractUserId(token);
                    UserRole role = jwtUtil.extractRole(token);
                    return new AuthContext(userId.toString(), role);
                } catch (RuntimeException ignored) {
                    return null;
                }
            }
        }

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

    private record AuthContext(String userId, UserRole role) {}
}
