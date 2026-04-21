package org.vidrec.videoservice.video;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/videos")
@RequiredArgsConstructor
public class VideoController {

    private final VideoService videoService;

    @PostMapping("/init")
    public ResponseEntity<VideoUploadInitResponse> initUpload(
        @Valid @RequestBody VideoUploadInitRequest request
    ) {
        UUID uploaderId = authenticatedUserId();
        VideoUploadInitResponse response = videoService.initUpload(uploaderId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{videoId}/upload")
    public ResponseEntity<VideoUploadResponse> uploadFile(
        @PathVariable String videoId,
        @RequestHeader("X-Upload-Token") String uploadToken,
        @RequestParam("file") MultipartFile file
    ) {
        UUID uploaderId = authenticatedUserId();
        VideoUploadResponse response = videoService.uploadFile(uploaderId, videoId, uploadToken, file);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{videoId}")
    public ResponseEntity<VideoResponse> getVideo(@PathVariable String videoId) {
        return ResponseEntity.ok(videoService.getVideo(videoId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<VideoUserListResponse> getUserVideos(
        @PathVariable UUID userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(videoService.getUserVideos(userId, page, size));
    }

    @GetMapping("/search")
    public ResponseEntity<VideoSearchResponse> search(
        @RequestParam String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(videoService.search(q, page, size));
    }

    @GetMapping("/catalog")
    public ResponseEntity<VideoCatalogResponse> getCatalog(
        @RequestParam(required = false) String categoryId,
        @RequestParam(required = false) String source,
        @RequestParam(required = false) String language,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(videoService.getCatalog(categoryId, source, language, page, size));
    }

    private UUID authenticatedUserId() {
        return UUID.fromString((String) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    }
}
