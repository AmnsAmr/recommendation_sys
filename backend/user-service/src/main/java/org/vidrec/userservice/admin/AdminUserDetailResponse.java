package org.vidrec.userservice.admin;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.vidrec.userservice.preference.PreferenceDTO;

public record AdminUserDetailResponse(
    UUID userId,
    String email,
    String username,
    String displayName,
    String bio,
    String profilePictureUrl,
    String role,
    boolean isActive,
    String banReason,
    LocalDateTime bannedAt,
    List<PreferenceDTO> preferences,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
