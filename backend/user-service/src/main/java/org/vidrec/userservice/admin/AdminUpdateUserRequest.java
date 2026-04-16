package org.vidrec.userservice.admin;

import jakarta.validation.constraints.Size;
import org.vidrec.userservice.user.UserRole;

public record AdminUpdateUserRequest(
    @Size(min = 2, max = 100) String displayName,
    @Size(max = 300) String bio,
    @Size(max = 2048) String profilePictureUrl,
    UserRole role
) {}
