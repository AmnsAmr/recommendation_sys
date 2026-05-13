package org.vidrec.videoservice.watch;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record WatchRequest(
    @NotBlank String videoId,
    @NotNull @PositiveOrZero Integer watchDuration,
    @NotNull @Positive Integer videoDuration,
    @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double completionPct,
    @NotBlank @Pattern(regexp = "own|youtube") String source
) {}
