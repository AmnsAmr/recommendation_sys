package org.vidrec.apigateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String USER_ROLE_HEADER = "X-User-Role";
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";
    private static final String BEARER_PREFIX = "Bearer ";

    private final SecretKey jwtKey;
    private final String internalServiceToken;
    private final boolean securityDisabled;
    private final String testUserId;
    private final String testUserRole;

    public JwtAuthFilter(
        @Value("${JWT_SECRET}") String jwtSecret,
        @Value("${INTERNAL_SERVICE_TOKEN}") String internalServiceToken,
        @Value("${app.security.disabled:true}") boolean securityDisabled,
        @Value("${app.security.test-user-id:00000000-0000-0000-0000-000000000001}") String testUserId,
        @Value("${app.security.test-role:ADMIN}") String testUserRole
    ) {
        this.jwtKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.internalServiceToken = internalServiceToken;
        this.securityDisabled = securityDisabled;
        this.testUserId = testUserId;
        this.testUserRole = StringUtils.hasText(testUserRole) ? testUserRole.toUpperCase() : "ADMIN";
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
            || "/actuator/health".equals(path)
            || "/actuator/info".equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!isGatewayManagedPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (securityDisabled) {
            // FIXME(RULES.md §4): test mode bypasses gateway JWT enforcement so the stack is easier to exercise locally.
            filterChain.doFilter(
                mutateRequest(request, resolveForwardedUserId(request), resolveForwardedUserRole(request)),
                response
            );
            return;
        }

        if (isPublicRoute(request)) {
            filterChain.doFilter(mutateRequest(request, null, null), response);
            return;
        }

        if (!isProtectedRoute(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = extractBearerToken(request);
        if (!StringUtils.hasText(token)) {
            writeUnauthorized(response, "Missing bearer token for protected route.");
            return;
        }

        try {
            Claims claims = Jwts.parser()
                .verifyWith(jwtKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

            String userId = UUID.fromString(claims.getSubject()).toString();
            String role = claims.get("role", String.class);
            if (!StringUtils.hasText(role)) {
                role = "USER";
            }

            filterChain.doFilter(mutateRequest(request, userId, role.toUpperCase()), response);
        } catch (RuntimeException exception) {
            log.debug("Rejected invalid JWT for path {}: {}", path, exception.getMessage());
            writeUnauthorized(response, "Invalid or expired bearer token.");
        }
    }

    private HttpServletRequest mutateRequest(HttpServletRequest request, String userId, String role) {
        Map<String, List<String>> headers = new LinkedHashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            if (AUTHORIZATION_HEADER.equalsIgnoreCase(headerName)) {
                continue;
            }
            headers.put(headerName, Collections.list(request.getHeaders(headerName)));
        }

        headers.put(INTERNAL_TOKEN_HEADER, List.of(internalServiceToken));
        if (StringUtils.hasText(userId)) {
            headers.put(USER_ID_HEADER, List.of(userId));
        }
        if (StringUtils.hasText(role)) {
            headers.put(USER_ROLE_HEADER, List.of(role));
        }

        return new HeaderOverrideRequestWrapper(request, headers);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader(AUTHORIZATION_HEADER);
        if (!StringUtils.hasText(authorization) || !authorization.startsWith(BEARER_PREFIX)) {
            return null;
        }

        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        return StringUtils.hasText(token) ? token : null;
    }

    private String resolveForwardedUserId(HttpServletRequest request) {
        String forwardedUserId = request.getHeader(USER_ID_HEADER);
        return StringUtils.hasText(forwardedUserId) ? forwardedUserId : testUserId;
    }

    private String resolveForwardedUserRole(HttpServletRequest request) {
        String forwardedUserRole = request.getHeader(USER_ROLE_HEADER);
        return StringUtils.hasText(forwardedUserRole) ? forwardedUserRole.toUpperCase() : testUserRole;
    }

    private boolean isGatewayManagedPath(String path) {
        return path.startsWith("/users/")
            || path.startsWith("/videos/")
            || path.startsWith("/recommendations/")
            || path.startsWith("/admin/users")
            || path.startsWith("/admin/videos");
    }

    private boolean isProtectedRoute(String path) {
        return path.startsWith("/users/")
            || path.startsWith("/videos/")
            || path.startsWith("/recommendations/")
            || path.startsWith("/admin/users")
            || path.startsWith("/admin/videos");
    }

    private boolean isPublicRoute(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();

        if ("POST".equalsIgnoreCase(method)) {
            return path.startsWith("/users/register") || path.startsWith("/users/login");
        }

        if ("GET".equalsIgnoreCase(method)) {
            return path.startsWith("/videos/catalog")
                || path.startsWith("/videos/search")
                || path.startsWith("/videos/youtube/search")
                || path.matches("^/videos/[^/]+/?$")
                || path.startsWith("/videos/user/")
                || path.startsWith("/recommendations/cold/")
                || path.startsWith("/recommendations/similar/");
        }

        return false;
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("""
            {"error":{"code":"UNAUTHORIZED","message":"%s","details":[]}}
            """.formatted(message));
    }

    private static final class HeaderOverrideRequestWrapper extends HttpServletRequestWrapper {

        private final Map<String, List<String>> headers;

        private HeaderOverrideRequestWrapper(HttpServletRequest request, Map<String, List<String>> headers) {
            super(request);
            this.headers = headers;
        }

        @Override
        public String getHeader(String name) {
            List<String> values = headers.get(name);
            if (values == null || values.isEmpty()) {
                return null;
            }
            return values.get(0);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            List<String> values = headers.get(name);
            if (values == null) {
                return Collections.emptyEnumeration();
            }
            return Collections.enumeration(values);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            return Collections.enumeration(new ArrayList<>(headers.keySet()));
        }
    }
}
