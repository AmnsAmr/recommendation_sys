package org.vidrec.userservice.user;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.vidrec.userservice.preference.PreferenceDTO;

public record UserProfileResponse(
    UUID userId,
    String username,
    String displayName,
    String bio,
    String profilePictureUrl,
    String email,
    List<PreferenceDTO> preferences,
    boolean isActive,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}