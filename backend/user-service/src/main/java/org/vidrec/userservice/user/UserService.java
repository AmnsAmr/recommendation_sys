package org.vidrec.userservice.user;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.userservice.event.UserEvent;
import org.vidrec.userservice.kafka.UserEventPublisher;
import org.vidrec.userservice.preference.PreferenceDTO;
import org.vidrec.userservice.preference.UpdatePreferencesRequest;
import org.vidrec.userservice.preference.UserPreference;
import org.vidrec.userservice.preference.UserPreferenceRepository;
import org.vidrec.userservice.shared.exception.ApiException;
import org.vidrec.userservice.shared.exception.ErrorDetail;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserEventPublisher eventPublisher;
    private final org.vidrec.userservice.security.JwtUtil jwtUtil;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw conflict("EMAIL_ALREADY_EXISTS", "This email is already registered.");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw conflict("USERNAME_ALREADY_EXISTS", "This username is already taken.");
        }

        User user = User.builder()
            .email(request.email())
            .passwordHash(passwordEncoder.encode(request.password()))
            .username(request.username())
            .displayName(request.displayName())
            .isActive(true)
            .build();
        user = userRepository.save(user);

        if (request.interests() != null) {
            for (String interest : request.interests()) {
                UserPreference pref = UserPreference.builder()
                    .userId(user.getId())
                    .category(interest)
                    .weight(1.0)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
                preferenceRepository.save(pref);
            }
        }

        UserEvent event = UserEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .userId(user.getId())
            .eventType("registered")
            .username(user.getUsername())
            .interests(request.interests())
            .timestamp(Instant.now())
            .build();
        eventPublisher.publishAfterCommit(event);

        String token = jwtUtil.generateToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getDisplayName(), jwtUtil.getExpirationMs() / 1000);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect."));

        if (!user.isActive()) {
            throw forbidden("ACCOUNT_INACTIVE", "Account has been deactivated.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect.");
        }

        String token = jwtUtil.generateToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getDisplayName(), jwtUtil.getExpirationMs() / 1000);
    }

    public UserProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> notFound("USER_NOT_FOUND", "No user with this ID."));
        List<PreferenceDTO> prefs = preferenceRepository.findByUserId(userId)
            .stream()
            .map(p -> new PreferenceDTO(p.getCategory(), p.getWeight()))
            .collect(Collectors.toList());

        return new UserProfileResponse(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getBio(),
            user.getProfilePictureUrl(),
            user.getEmail(),
            prefs,
            user.isActive(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        if (request.displayName() == null && request.bio() == null && request.profilePictureUrl() == null) {
            throw badRequest("VALIDATION_ERROR", "At least one field must be provided.");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> notFound("USER_NOT_FOUND", "No user with this ID."));

        if (request.displayName() != null) {
            user.setDisplayName(request.displayName());
        }
        if (request.bio() != null) {
            user.setBio(request.bio());
        }
        if (request.profilePictureUrl() != null) {
            user.setProfilePictureUrl(request.profilePictureUrl());
        }

        userRepository.save(user);
        return getProfile(userId);
    }

    @Transactional
    public UserProfileResponse updatePreferences(UUID userId, UpdatePreferencesRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> notFound("USER_NOT_FOUND", "No user with this ID."));
        if (!user.isActive()) {
            throw forbidden("ACCOUNT_INACTIVE", "Account has been deactivated.");
        }

        preferenceRepository.deleteByUserId(userId);
        for (PreferenceDTO pref : request.preferences()) {
            UserPreference entity = UserPreference.builder()
                .userId(userId)
                .category(pref.category())
                .weight(pref.weight())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
            preferenceRepository.save(entity);
        }

        UserEvent event = UserEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .userId(userId)
            .eventType("prefs_updated")
            .preferences(request.preferences().stream().map(PreferenceDTO::category).collect(Collectors.toList()))
            .timestamp(Instant.now())
            .build();
        eventPublisher.publishAfterCommit(event);

        return getProfile(userId);
    }

    @Transactional
    public void deactivateUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> notFound("USER_NOT_FOUND", "No user with this ID."));
        user.setActive(false);
        userRepository.save(user);

        UserEvent event = UserEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .userId(userId)
            .eventType("deactivated")
            .timestamp(Instant.now())
            .build();
        eventPublisher.publishAfterCommit(event);
    }

    private ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message, List.of());
    }

    private ApiException unauthorized(String code, String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, code, message, List.of());
    }

    private ApiException forbidden(String code, String message) {
        return new ApiException(HttpStatus.FORBIDDEN, code, message, List.of());
    }

    private ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message, List.of());
    }

    private ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message, List.of(new ErrorDetail("request", message)));
    }
}