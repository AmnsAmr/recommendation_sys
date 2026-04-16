package org.vidrec.videoservice.admin;

import jakarta.validation.constraints.Size;

public record AdminVideoUpdateRequest(
    @Size(min = 3, max = 200) String title,
    @Size(max = 5000) String description,
    String categoryId,
    @Size(min = 2, max = 10) String language
) {}
