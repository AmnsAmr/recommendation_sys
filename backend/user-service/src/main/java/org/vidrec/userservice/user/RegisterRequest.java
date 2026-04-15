package org.vidrec.userservice.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record RegisterRequest(
    @Email @NotBlank @Size(max = 255) String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "^[a-zA-Z0-9_]+$") String username,
    @NotBlank @Size(min = 2, max = 100) String displayName,
    @NotNull @Size(min = 1, max = 10) List<String> interests
) {}
