package org.vidrec.videoservice.admin;

import jakarta.validation.constraints.Size;

public record AdminModerationRequest(
    @Size(max = 500) String notes
) {}
