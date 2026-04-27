package org.vidrec.videoservice.video;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.vidrec.videoservice.shared.exception.ApiException;
import org.vidrec.videoservice.storage.R2StorageService;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoService {

    private static final int TOKEN_EXPIRY_MINUTES = 15;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "video/mp4", "video/quicktime"
    );
    private static final long MAX_FILE_SIZE = 500L * 1024 * 1024;

    private final VideoRepository videoRepository;
    private final VideoTagRepository videoTagRepository;
    private final UploadTokenRepository uploadTokenRepository;
    private final CategoryRepository categoryRepository;
    private final R2StorageService r2StorageService;
    private final VideoDurationProbe videoDurationProbe;

    @Transactional
    public VideoUploadInitResponse initUpload(UUID uploaderId, VideoUploadInitRequest request) {
        categoryRepository.findById(request.categoryId())
            .orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND",
                "Category not found: " + request.categoryId(), List.of()));

        String videoId = generateVideoId();
        String language = request.language() != null ? request.language() : "en";

        Video video = Video.builder()
            .id(videoId)
            .title(request.title().trim())
            .description(request.description())
            .categoryId(request.categoryId())
            .language(language)
            .source(VideoSource.OWN)
            .uploaderId(uploaderId)
            .status(VideoStatus.PENDING)
            .viewCount(0L)
            .likeCount(0L)
            .dislikeCount(0L)
            .build();
        videoRepository.save(video);

        if (request.tags() != null) {
            for (String tag : request.tags()) {
                videoTagRepository.save(VideoTag.builder()
                    .id(new VideoTagId(videoId, tag))
                    .build());
            }
        }

        UUID token = UUID.randomUUID();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(TOKEN_EXPIRY_MINUTES);

        uploadTokenRepository.save(UploadToken.builder()
            .token(token)
            .videoId(videoId)
            .uploaderId(uploaderId)
            .expiresAt(expiresAt)
            .used(false)
            .build());

        return new VideoUploadInitResponse(videoId, token.toString(), expiresAt);
    }

    @Transactional
    public VideoUploadResponse uploadFile(UUID uploaderId, String videoId, String uploadToken, MultipartFile file) {
        Video video = videoRepository.findById(videoId)
            .orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND",
                "No pending video with id: " + videoId, List.of()));

        if (video.getStatus() != VideoStatus.PENDING) {
            throw new ApiException(HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND",
                "No pending video with id: " + videoId, List.of());
        }

        UUID tokenUuid;
        try {
            tokenUuid = UUID.fromString(uploadToken);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_UPLOAD_TOKEN",
                "Upload token is malformed.", List.of());
        }

        UploadToken token = uploadTokenRepository.findById(tokenUuid)
            .orElseThrow(() -> new ApiException(
                HttpStatus.BAD_REQUEST, "INVALID_UPLOAD_TOKEN",
                "Upload token not found.", List.of()));

        if (token.isUsed()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_UPLOAD_TOKEN",
                "Upload token has already been used.", List.of());
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_UPLOAD_TOKEN",
                "Upload token has expired.", List.of());
        }
        if (!token.getVideoId().equals(videoId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_UPLOAD_TOKEN",
                "Upload token does not match this video.", List.of());
        }
        if (!token.getUploaderId().equals(uploaderId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                "You are not the uploader of this video.", List.of());
        }

        validateFile(file);

        String extension = extractExtension(file.getContentType());
        String s3Key = "videos/" + videoId + "." + extension;

        Path temp = null;
        Integer durationSeconds = null;
        try {
            temp = Files.createTempFile("upload-" + videoId + "-", "." + extension);
            file.transferTo(temp);
            durationSeconds = videoDurationProbe.probeSeconds(temp);
            try (InputStream in = Files.newInputStream(temp)) {
                r2StorageService.upload(s3Key, in, file.getSize(), file.getContentType());
            }
        } catch (IOException ex) {
            log.error("Failed to read upload stream for video={}", videoId, ex);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Failed to process uploaded file.", List.of());
        } finally {
            if (temp != null) {
                try {
                    Files.deleteIfExists(temp);
                } catch (IOException ex) {
                    log.warn("Failed to delete temp upload file {}: {}", temp, ex.getMessage());
                }
            }
        }

        token.setUsed(true);
        uploadTokenRepository.save(token);

        String videoUrl = r2StorageService.getPublicUrl(s3Key);
        String thumbnailUrl = r2StorageService.getPublicUrl("thumbnails/" + videoId + ".jpg");

        video.setS3Key(s3Key);
        video.setThumbnailUrl(thumbnailUrl);
        video.setDuration(durationSeconds);
        video.setStatus(VideoStatus.UNDER_REVIEW);
        videoRepository.save(video);

        return new VideoUploadResponse(
            videoId,
            VideoStatus.UNDER_REVIEW.name(),
            thumbnailUrl,
            videoUrl,
            video.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public VideoResponse getVideo(String videoId) {
        Video video = videoRepository.findById(videoId)
            .filter(v -> v.getStatus() == VideoStatus.READY)
            .orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND",
                "No video with id: " + videoId, List.of()));
        return toVideoResponse(video, loadTags(videoId));
    }

    @Transactional(readOnly = true)
    public VideoUserListResponse getUserVideos(UUID userId, int page, int size) {
        Pageable pageable = pageable(page, size);
        Page<Video> videos = videoRepository.findByUploaderIdAndStatusOrderByCreatedAtDesc(
            userId, VideoStatus.READY, pageable);
        List<VideoUserListItem> items = videos.stream()
            .map(v -> toUserListItem(v, loadTags(v.getId())))
            .toList();
        return new VideoUserListResponse(items, videos.getNumber(), videos.getSize(), videos.getTotalElements());
    }

    @Transactional(readOnly = true)
    public VideoSearchResponse search(String query, int page, int size) {
        if (query == null || query.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Query parameter 'q' is required.", List.of());
        }
        String trimmed = query.trim();
        Pageable pageable = pageable(page, size);
        Page<Video> videos = videoRepository.search(trimmed, VideoStatus.READY, pageable);
        List<VideoSearchItem> items = videos.stream()
            .map(v -> toSearchItem(v, loadTags(v.getId())))
            .toList();
        return new VideoSearchResponse(trimmed, items, videos.getNumber(), videos.getSize(), videos.getTotalElements());
    }

    @Transactional(readOnly = true)
    public VideoCatalogResponse getCatalog(String categoryId, String source, String language, int page, int size) {
        VideoSource sourceEnum = parseSource(source);
        Pageable pageable = pageable(page, size);
        Page<Video> videos = videoRepository.findCatalog(
            VideoStatus.READY, categoryId, sourceEnum, language, pageable);
        List<VideoCatalogItem> items = videos.stream()
            .map(v -> toCatalogItem(v, loadTags(v.getId())))
            .toList();
        return new VideoCatalogResponse(items, videos.getNumber(), videos.getSize(), videos.getTotalElements());
    }

    private Pageable pageable(int page, int size) {
        if (page < 0 || size <= 0 || size > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Invalid page or size.", List.of());
        }
        return PageRequest.of(page, size);
    }

    private VideoSource parseSource(String source) {
        if (source == null || source.isBlank()) {
            return null;
        }
        try {
            return VideoSource.valueOf(source.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Invalid source: " + source, List.of());
        }
    }

    private List<String> loadTags(String videoId) {
        return videoTagRepository.findByIdVideoId(videoId).stream()
            .map(tag -> tag.getId().getTag())
            .toList();
    }

    private VideoResponse toVideoResponse(Video video, List<String> tags) {
        String url = video.getSource() == VideoSource.OWN && video.getS3Key() != null
            ? r2StorageService.getPublicUrl(video.getS3Key())
            : null;
        return new VideoResponse(
            video.getId(),
            video.getTitle(),
            video.getDescription(),
            video.getCategoryId(),
            tags,
            video.getSource().name().toLowerCase(),
            video.getYoutubeId(),
            url,
            video.getThumbnailUrl(),
            video.getDuration(),
            video.getViewCount(),
            video.getLikeCount(),
            video.getDislikeCount(),
            video.getLanguage(),
            video.getUploaderId(),
            video.getStatus().name(),
            video.getCreatedAt()
        );
    }

    private VideoUserListItem toUserListItem(Video video, List<String> tags) {
        return new VideoUserListItem(
            video.getId(),
            video.getTitle(),
            video.getCategoryId(),
            tags,
            video.getThumbnailUrl(),
            video.getDuration(),
            video.getViewCount(),
            video.getLikeCount(),
            video.getDislikeCount(),
            video.getLanguage(),
            video.getStatus().name(),
            video.getCreatedAt()
        );
    }

    private VideoSearchItem toSearchItem(Video video, List<String> tags) {
        return new VideoSearchItem(
            video.getId(),
            video.getTitle(),
            video.getCategoryId(),
            tags,
            video.getThumbnailUrl(),
            video.getDuration(),
            video.getViewCount(),
            video.getLikeCount(),
            video.getLanguage(),
            video.getSource().name().toLowerCase(),
            video.getCreatedAt()
        );
    }

    private VideoCatalogItem toCatalogItem(Video video, List<String> tags) {
        return new VideoCatalogItem(
            video.getId(),
            video.getTitle(),
            video.getCategoryId(),
            tags,
            video.getThumbnailUrl(),
            video.getSource().name().toLowerCase(),
            video.getYoutubeId(),
            video.getDuration(),
            video.getViewCount(),
            video.getLikeCount(),
            video.getDislikeCount(),
            video.getLanguage(),
            video.getCreatedAt()
        );
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "File is required.", List.of());
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE",
                "Allowed types: video/mp4, video/quicktime.", List.of());
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE",
                "Maximum file size is 500 MB.", List.of());
        }
    }

    private String extractExtension(String contentType) {
        return switch (contentType) {
            case "video/mp4" -> "mp4";
            case "video/quicktime" -> "mov";
            default -> "mp4";
        };
    }

    private String generateVideoId() {
        String chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder("vid_");
        ThreadLocalRandom random = ThreadLocalRandom.current();
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
