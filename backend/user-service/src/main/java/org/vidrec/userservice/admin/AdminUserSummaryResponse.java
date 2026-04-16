package org.vidrec.userservice.admin;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminUserSummaryResponse(
    UUID userId,
    String email,
    String username,
    String displayName,
    String role,
    boolean isActive,
    LocalDateTime bannedAt,
    LocalDateTime createdAt
) {}
