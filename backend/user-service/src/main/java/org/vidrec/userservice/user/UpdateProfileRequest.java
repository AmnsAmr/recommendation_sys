package org.vidrec.userservice.user;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 2, max = 100) String displayName,
    @Size(max = 300) String bio,
    @Size(max = 2048) String profilePictureUrl
) {}