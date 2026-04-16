package org.vidrec.videoservice.admin;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/videos")
@RequiredArgsConstructor
public class AdminVideoController {

    private final AdminVideoService adminVideoService;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminVideoDashboardResponse> getDashboard() {
        return ResponseEntity.ok(adminVideoService.getDashboard());
    }

    @GetMapping("/pending")
    public ResponseEntity<AdminVideoListResponse> listPending(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(adminVideoService.listPending(page, size));
    }

    @GetMapping("/{videoId}")
    public ResponseEntity<AdminVideoDetailResponse> getVideo(@PathVariable String videoId) {
        return ResponseEntity.ok(adminVideoService.getVideo(videoId));
    }

    @PutMapping("/{videoId}")
    public ResponseEntity<AdminVideoDetailResponse> updateVideo(
        @PathVariable String videoId,
        @Valid @RequestBody AdminVideoUpdateRequest request
    ) {
        return ResponseEntity.ok(adminVideoService.updateVideo(videoId, request));
    }

    @PostMapping("/{videoId}/approve")
    public ResponseEntity<AdminVideoDetailResponse> approveVideo(
        @PathVariable String videoId,
        @Valid @RequestBody AdminModerationRequest request
    ) {
        return ResponseEntity.ok(adminVideoService.approveVideo(videoId, authenticatedUserId(), request));
    }

    @PostMapping("/{videoId}/reject")
    public ResponseEntity<AdminVideoDetailResponse> rejectVideo(
        @PathVariable String videoId,
        @Valid @RequestBody AdminModerationRequest request
    ) {
        return ResponseEntity.ok(adminVideoService.rejectVideo(videoId, authenticatedUserId(), request));
    }

    @DeleteMapping("/{videoId}")
    public ResponseEntity<Void> deleteVideo(@PathVariable String videoId) {
        adminVideoService.deleteVideo(videoId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    private UUID authenticatedUserId() {
        return UUID.fromString((String) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    }
}
