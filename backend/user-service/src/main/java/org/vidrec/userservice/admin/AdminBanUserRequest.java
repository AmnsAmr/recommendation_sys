package org.vidrec.userservice.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminBanUserRequest(
    @NotBlank @Size(max = 255) String reason
) {}
