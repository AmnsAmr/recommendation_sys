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

    public JwtAuthFilter(
        @Value("${JWT_SECRET}") String jwtSecret,
        @Value("${INTERNAL_SERVICE_TOKEN}") String internalServiceToken
    ) {
        this.jwtKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.internalServiceToken = internalServiceToken;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "/actuator/health".equals(path) || "/actuator/info".equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!isGatewayManagedPath(path)) {
            filterChain.doFilter(request, response);
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

        if ("POST".equalsIgnoreCase(method) && ("/users/register".equals(path) || "/users/login".equals(path))) {
            return true;
        }

        if ("GET".equalsIgnoreCase(method)) {
            if ("/videos/catalog".equals(path) || "/videos/search".equals(path)) {
                return true;
            }
            if (path.matches("^/videos/[^/]+$") || path.matches("^/videos/user/[^/]+$")) {
                return true;
            }
            if (path.matches("^/recommendations/cold/[^/]+$") || path.matches("^/recommendations/similar/[^/]+$")) {
                return true;
            }
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
