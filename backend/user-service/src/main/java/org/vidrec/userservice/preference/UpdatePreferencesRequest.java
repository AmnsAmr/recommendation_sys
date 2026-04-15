package org.vidrec.userservice.preference;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record UpdatePreferencesRequest(
    @NotEmpty List<PreferenceDTO> preferences
) {}