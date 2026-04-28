package org.vidrec.userservice.admin;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.userservice.event.UserEvent;
import org.vidrec.userservice.kafka.UserEventPublisher;
import org.vidrec.userservice.preference.PreferenceDTO;
import org.vidrec.userservice.preference.UserPreferenceRepository;
import org.vidrec.userservice.shared.exception.ApiException;
import org.vidrec.userservice.shared.exception.ErrorDetail;
import org.vidrec.userservice.user.User;
import org.vidrec.userservice.user.UserRepository;
import org.vidrec.userservice.user.UserRole;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final UserEventPublisher eventPublisher;

    public AdminDashboardResponse getDashboard() {
        List<AdminDashboardRecentUserResponse> latestUsers = userRepository
            .findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
            .stream()
            .map(this::toRecentUser)
            .toList();

        return new AdminDashboardResponse(
            userRepository.count(),
            userRepository.countByIsActive(true),
            userRepository.countByBannedAtIsNotNull(),
            userRepository.countByRole(UserRole.ADMIN),
            userRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(7)),
            latestUsers
        );
    }

    public AdminUserListResponse listUsers(int page, int size, Boolean active, UserRole role) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> userPage = resolveUserPage(active, role, pageable);
        return new AdminUserListResponse(
            userPage.stream().map(this::toSummary).toList(),
            userPage.getNumber(),
            userPage.getSize(),
            userPage.getTotalElements()
        );
    }

    public AdminUserDetailResponse getUser(UUID userId) {
        return toDetail(getRequiredUser(userId));
    }

    @Transactional
    public AdminUserDetailResponse updateUser(UUID userId, AdminUpdateUserRequest request, UUID adminId) {
        if (request.displayName() == null && request.bio() == null
            && request.profilePictureUrl() == null && request.role() == null) {
            throw badRequest("VALIDATION_ERROR", "At least one field must be provided.");
        }

        User user = getRequiredUser(userId);
        if (adminId.equals(userId) && request.role() == UserRole.USER) {
            throw forbidden("FORBIDDEN", "Admin cannot remove their own admin role.");
        }

        if (request.displayName() != null) {
            user.setDisplayName(request.displayName());
        }
        if (request.bio() != null) {
            user.setBio(request.bio());
        }
        if (request.profilePictureUrl() != null) {
            user.setProfilePictureUrl(request.profilePictureUrl());
        }
        if (request.role() != null) {
            user.setRole(request.role());
        }

        return toDetail(userRepository.save(user));
    }

    @Transactional
    public AdminUserDetailResponse banUser(UUID userId, AdminBanUserRequest request, UUID adminId) {
        if (adminId.equals(userId)) {
            throw forbidden("FORBIDDEN", "Admin cannot ban their own account.");
        }

        User user = getRequiredUser(userId);
        user.setActive(false);
        user.setBannedAt(LocalDateTime.now());
        user.setBanReason(request.reason());
        User savedUser = userRepository.save(user);

        publishLifecycleEvent(savedUser.getId(), "banned", request.reason());
        return toDetail(savedUser);
    }

    @Transactional
    public AdminUserDetailResponse unbanUser(UUID userId) {
        User user = getRequiredUser(userId);
        if (user.getBannedAt() == null) {
            throw badRequest("USER_NOT_BANNED", "User is not currently banned.");
        }

        user.setActive(true);
        user.setBannedAt(null);
        user.setBanReason(null);
        User savedUser = userRepository.save(user);

        publishLifecycleEvent(savedUser.getId(), "reinstated", null);
        return toDetail(savedUser);
    }

    @Transactional
    public void deleteUser(UUID userId, UUID adminId) {
        if (adminId.equals(userId)) {
            throw forbidden("FORBIDDEN", "Admin cannot delete their own account.");
        }

        User user = getRequiredUser(userId);
        preferenceRepository.deleteByUserId(userId);
        userRepository.delete(user);
        publishLifecycleEvent(userId, "deleted", "Deleted by admin");
    }

    private Page<User> resolveUserPage(Boolean active, UserRole role, Pageable pageable) {
        if (active != null && role != null) {
            return userRepository.findByRoleAndIsActive(role, active, pageable);
        }
        if (active != null) {
            return userRepository.findByIsActive(active, pageable);
        }
        if (role != null) {
            return userRepository.findByRole(role, pageable);
        }
        return userRepository.findAll(pageable);
    }

    private User getRequiredUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "No user with this ID.", List.of()));
    }

    private AdminDashboardRecentUserResponse toRecentUser(User user) {
        return new AdminDashboardRecentUserResponse(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getRole().name(),
            user.isActive(),
            user.getCreatedAt()
        );
    }

    private AdminUserSummaryResponse toSummary(User user) {
        return new AdminUserSummaryResponse(
            user.getId(),
            user.getEmail(),
            user.getUsername(),
            user.getDisplayName(),
            user.getRole().name(),
            user.isActive(),
            user.getBannedAt(),
            user.getCreatedAt()
        );
    }

    private AdminUserDetailResponse toDetail(User user) {
        List<PreferenceDTO> preferences = preferenceRepository.findByUserId(user.getId())
            .stream()
            .map(pref -> new PreferenceDTO(pref.getCategory(), pref.getWeight()))
            .toList();

        return new AdminUserDetailResponse(
            user.getId(),
            user.getEmail(),
            user.getUsername(),
            user.getDisplayName(),
            user.getBio(),
            user.getProfilePictureUrl(),
            user.getRole().name(),
            user.isActive(),
            user.getBanReason(),
            user.getBannedAt(),
            preferences,
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }

    private void publishLifecycleEvent(UUID userId, String eventType, String reason) {
        UserEvent event = UserEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .userId(userId)
            .eventType(eventType)
            .reason(reason)
            .timestamp(Instant.now())
            .build();
        eventPublisher.publishAfterCommit(event);
    }

    private ApiException forbidden(String code, String message) {
        return new ApiException(HttpStatus.FORBIDDEN, code, message, List.of());
    }

    private ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message, List.of(new ErrorDetail("request", message)));
    }
}
