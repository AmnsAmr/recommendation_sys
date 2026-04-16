package org.vidrec.userservice.user;

import java.util.UUID;

public record AuthResponse(
    String token,
    UUID userId,
    String username,
    String displayName,
    String role,
    long expiresIn
) {}
