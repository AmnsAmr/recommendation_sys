package org.vidrec.userservice.admin;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminDashboardRecentUserResponse(
    UUID userId,
    String username,
    String displayName,
    String role,
    boolean isActive,
    LocalDateTime createdAt
) {}
