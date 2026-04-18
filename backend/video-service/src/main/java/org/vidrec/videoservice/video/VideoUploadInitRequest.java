package org.vidrec.videoservice.video;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record VideoUploadInitRequest(

    @NotBlank
    @Size(min = 3, max = 200)
    String title,

    @Size(max = 5000)
    String description,

    @NotBlank
    String categoryId,

    @Size(max = 10)
    List<@Size(max = 50) @Pattern(regexp = "^[a-z0-9\\-]+$") String> tags,

    @Size(min = 2, max = 2)
    String language
) {}
