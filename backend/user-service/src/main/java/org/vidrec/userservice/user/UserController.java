package org.vidrec.userservice.user;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.vidrec.userservice.preference.UpdatePreferencesRequest;
import org.vidrec.userservice.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> getProfile(
        @PathVariable UUID userId,
        @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
        Authentication authentication
    ) {
        assertOwner(userId, headerUserId, authentication);
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
        @PathVariable UUID userId,
        @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        assertOwner(userId, headerUserId, authentication);
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PutMapping("/{userId}/preferences")
    public ResponseEntity<UserProfileResponse> updatePreferences(
        @PathVariable UUID userId,
        @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
        Authentication authentication,
        @Valid @RequestBody UpdatePreferencesRequest request
    ) {
        assertOwner(userId, headerUserId, authentication);
        return ResponseEntity.ok(userService.updatePreferences(userId, request));
    }

    private void assertOwner(UUID pathUserId, String headerUserId, Authentication authentication) {
        String authenticatedUserId = resolveAuthenticatedUserId(headerUserId, authentication);
        if (authenticatedUserId == null || authenticatedUserId.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Missing authenticated user context.", List.of());
        }
        if (!pathUserId.toString().equals(authenticatedUserId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "JWT userId does not match path userId.", List.of());
        }
    }

    private String resolveAuthenticatedUserId(String headerUserId, Authentication authentication) {
        if (headerUserId != null && !headerUserId.isBlank()) {
            return headerUserId;
        }
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        return authentication.getPrincipal().toString();
    }
}
