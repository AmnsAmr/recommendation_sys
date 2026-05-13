package org.vidrec.videoservice.search;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SearchClickRequest(
    @NotBlank @Size(max = 200) String query,
    @NotNull @Size(max = 50) List<String> resultVideoIds,
    String clickedVideoId
) {}
