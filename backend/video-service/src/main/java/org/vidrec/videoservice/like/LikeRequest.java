package org.vidrec.videoservice.like;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LikeRequest(
    @NotBlank @Pattern(regexp = "like|dislike") String action
) {}
