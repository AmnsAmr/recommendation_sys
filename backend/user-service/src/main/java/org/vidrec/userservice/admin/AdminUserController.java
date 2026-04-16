package org.vidrec.userservice.admin;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.vidrec.userservice.user.UserRole;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        return ResponseEntity.ok(adminUserService.getDashboard());
    }

    @GetMapping
    public ResponseEntity<AdminUserListResponse> listUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) Boolean active,
        @RequestParam(required = false) UserRole role
    ) {
        return ResponseEntity.ok(adminUserService.listUsers(page, size, active, role));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<AdminUserDetailResponse> getUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(adminUserService.getUser(userId));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<AdminUserDetailResponse> updateUser(
        @PathVariable UUID userId,
        @Valid @RequestBody AdminUpdateUserRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(adminUserService.updateUser(userId, request, authenticatedUserId(authentication)));
    }

    @PutMapping("/{userId}/ban")
    public ResponseEntity<AdminUserDetailResponse> banUser(
        @PathVariable UUID userId,
        @Valid @RequestBody AdminBanUserRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(adminUserService.banUser(userId, request, authenticatedUserId(authentication)));
    }

    @PutMapping("/{userId}/unban")
    public ResponseEntity<AdminUserDetailResponse> unbanUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(adminUserService.unbanUser(userId));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId, Authentication authentication) {
        adminUserService.deleteUser(userId, authenticatedUserId(authentication));
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return UUID.fromString(authentication.getPrincipal().toString());
    }
}
