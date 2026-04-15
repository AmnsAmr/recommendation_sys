package org.vidrec.userservice.preference;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PreferenceDTO(
    @NotBlank @Size(max = 100) String category,
    @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double weight
) {}
