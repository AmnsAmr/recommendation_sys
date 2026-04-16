package org.vidrec.videoservice.admin;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/admin/videos")
@RequiredArgsConstructor
public class AdminVideoController {

    private final AdminVideoService adminVideoService;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminVideoDashboardResponse> getDashboard(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        requireAdmin(userId, userRole);
        return ResponseEntity.ok(adminVideoService.getDashboard());
    }

    @GetMapping("/pending")
    public ResponseEntity<AdminVideoListResponse> listPending(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestHeader(value = "X-User-Role", required = false) String userRole,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        requireAdmin(userId, userRole);
        return ResponseEntity.ok(adminVideoService.listPending(page, size));
    }

    @GetMapping("/{videoId}")
    public ResponseEntity<AdminVideoDetailResponse> getVideo(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestHeader(value = "X-User-Role", required = false) String userRole,
        @PathVariable String videoId
    ) {
        requireAdmin(userId, userRole);
        return ResponseEntity.ok(adminVideoService.getVideo(videoId));
    }

    @PutMapping("/{videoId}")
    public ResponseEntity<AdminVideoDetailResponse> updateVideo(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestHeader(value = "X-User-Role", required = false) String userRole,
        @PathVariable String videoId,
        @Valid @RequestBody AdminVideoUpdateRequest request
    ) {
        requireAdmin(userId, userRole);
        return ResponseEntity.ok(adminVideoService.updateVideo(videoId, request));
    }

    @PostMapping("/{videoId}/approve")
    public ResponseEntity<AdminVideoDetailResponse> approveVideo(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestHeader(value = "X-User-Role", required = false) String userRole,
        @PathVariable String videoId,
        @Valid @RequestBody AdminModerationRequest request
    ) {
        UUID adminId = requireAdmin(userId, userRole);
        return ResponseEntity.ok(adminVideoService.approveVideo(videoId, adminId, request));
    }

    @PostMapping("/{videoId}/reject")
    public ResponseEntity<AdminVideoDetailResponse> rejectVideo(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestHeader(value = "X-User-Role", required = false) String userRole,
        @PathVariable String videoId,
        @Valid @RequestBody AdminModerationRequest request
    ) {
        UUID adminId = requireAdmin(userId, userRole);
        return ResponseEntity.ok(adminVideoService.rejectVideo(videoId, adminId, request));
    }

    @DeleteMapping("/{videoId}")
    public ResponseEntity<Void> deleteVideo(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestHeader(value = "X-User-Role", required = false) String userRole,
        @PathVariable String videoId
    ) {
        requireAdmin(userId, userRole);
        adminVideoService.deleteVideo(videoId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    private UUID requireAdmin(String userId, String userRole) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id.");
        }
        if (userRole == null || !"ADMIN".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required.");
        }
        return UUID.fromString(userId);
    }
}
