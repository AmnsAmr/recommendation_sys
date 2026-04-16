package org.vidrec.userservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.vidrec.userservice.user.UserRole;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
        @Value("${JWT_SECRET}") String secret,
        @Value("${JWT_EXPIRATION_MS:86400000}") long expirationMs
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(UUID userId, UserRole role) {
        Instant now = Instant.now();
        return Jwts.builder()
            .setSubject(userId.toString())
            .claim("role", role.name())
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(now.plusMillis(expirationMs)))
            .signWith(key, SignatureAlgorithm.HS256)
            .compact();
    }

    public UUID extractUserId(String token) {
        String subject = parseClaims(token).getSubject();
        return UUID.fromString(subject);
    }

    public UserRole extractRole(String token) {
        String role = parseClaims(token).get("role", String.class);
        if (role == null || role.isBlank()) {
            return UserRole.USER;
        }
        return UserRole.valueOf(role);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
