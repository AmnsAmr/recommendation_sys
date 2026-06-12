package org.vidrec.userservice.user;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Public, non-sensitive view of a user used to render a creator's channel name
 * and avatar on videos owned by someone other than the viewer. Deliberately
 * omits email, role, preferences, and active flag so it can be served without
 * the owner check that guards {@link UserProfileResponse}.
 */
public record PublicProfileResponse(
    UUID userId,
    String username,
    String displayName,
    String bio,
    String profilePictureUrl,
    LocalDateTime createdAt
) {}
