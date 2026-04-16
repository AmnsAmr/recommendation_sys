package org.vidrec.videoservice.admin;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.vidrec.videoservice.outbox.OutboxEvent;
import org.vidrec.videoservice.outbox.OutboxEventRepository;
import org.vidrec.videoservice.video.Video;
import org.vidrec.videoservice.video.VideoRepository;
import org.vidrec.videoservice.video.VideoSource;
import org.vidrec.videoservice.video.VideoStatus;
import org.vidrec.videoservice.video.VideoTagRepository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class AdminVideoService {

    private static final String VIDEO_UPLOADED_TOPIC = "video.uploaded";
    private static final String OUTBOX_PENDING = "PENDING";

    private final VideoRepository videoRepository;
    private final VideoTagRepository videoTagRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public AdminVideoDashboardResponse getDashboard() {
        return new AdminVideoDashboardResponse(
            videoRepository.count(),
            videoRepository.countByStatus(VideoStatus.READY),
            videoRepository.countByStatus(VideoStatus.UNDER_REVIEW),
            videoRepository.countByStatus(VideoStatus.REJECTED),
            videoRepository.countBySource(VideoSource.YOUTUBE),
            videoRepository.countBySource(VideoSource.OWN),
            videoRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(7)),
            videoRepository.sumAllViews() == null ? 0L : videoRepository.sumAllViews()
        );
    }

    public AdminVideoListResponse listPending(int page, int size) {
        Page<Video> videos = videoRepository.findByStatusOrderByCreatedAtAsc(
            VideoStatus.UNDER_REVIEW,
            PageRequest.of(page, size)
        );
        return new AdminVideoListResponse(
            videos.stream().map(this::toSummary).toList(),
            videos.getNumber(),
            videos.getSize(),
            videos.getTotalElements()
        );
    }

    public AdminVideoDetailResponse getVideo(String videoId) {
        return toDetail(getRequiredVideo(videoId));
    }

    @Transactional
    public AdminVideoDetailResponse updateVideo(String videoId, AdminVideoUpdateRequest request) {
        if (request.title() == null && request.description() == null
            && request.categoryId() == null && request.language() == null) {
            throw badRequest("At least one field must be provided.");
        }

        Video video = getRequiredOwnVideo(videoId);
        if (request.title() != null) {
            video.setTitle(request.title());
        }
        if (request.description() != null) {
            video.setDescription(request.description());
        }
        if (request.categoryId() != null) {
            video.setCategoryId(request.categoryId());
        }
        if (request.language() != null) {
            video.setLanguage(request.language());
        }
        return toDetail(videoRepository.save(video));
    }

    @Transactional
    public AdminVideoDetailResponse approveVideo(String videoId, UUID adminId, AdminModerationRequest request) {
        Video video = getRequiredOwnVideo(videoId);
        if (video.getStatus() != VideoStatus.UNDER_REVIEW) {
            throw badRequest("Only videos under review can be approved.");
        }

        video.setStatus(VideoStatus.READY);
        video.setModerationNotes(request.notes());
        video.setReviewedBy(adminId);
        video.setReviewedAt(LocalDateTime.now());
        video.setPublishedAt(LocalDateTime.now());
        Video savedVideo = videoRepository.save(video);

        outboxEventRepository.save(
            OutboxEvent.builder()
                .aggregateType("video")
                .aggregateId(savedVideo.getId())
                .topic(VIDEO_UPLOADED_TOPIC)
                .payload(buildUploadedPayload(savedVideo))
                .status(OUTBOX_PENDING)
                .build()
        );

        return toDetail(savedVideo);
    }

    @Transactional
    public AdminVideoDetailResponse rejectVideo(String videoId, UUID adminId, AdminModerationRequest request) {
        Video video = getRequiredOwnVideo(videoId);
        if (video.getStatus() != VideoStatus.UNDER_REVIEW) {
            throw badRequest("Only videos under review can be rejected.");
        }

        video.setStatus(VideoStatus.REJECTED);
        video.setModerationNotes(request.notes());
        video.setReviewedBy(adminId);
        video.setReviewedAt(LocalDateTime.now());
        video.setPublishedAt(null);
        return toDetail(videoRepository.save(video));
    }

    @Transactional
    public void deleteVideo(String videoId) {
        Video video = getRequiredOwnVideo(videoId);
        videoTagRepository.deleteAll(videoTagRepository.findByIdVideoId(videoId));
        outboxEventRepository.deleteByAggregateId(videoId);
        videoRepository.delete(video);
    }

    private Video getRequiredVideo(String videoId) {
        return videoRepository.findById(videoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND"));
    }

    private Video getRequiredOwnVideo(String videoId) {
        Video video = getRequiredVideo(videoId);
        if (video.getSource() != VideoSource.OWN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only platform uploads can be moderated.");
        }
        return video;
    }

    private AdminVideoSummaryResponse toSummary(Video video) {
        return new AdminVideoSummaryResponse(
            video.getId(),
            video.getTitle(),
            video.getUploaderId(),
            video.getStatus().name(),
            video.getThumbnailUrl(),
            video.getCreatedAt()
        );
    }

    private AdminVideoDetailResponse toDetail(Video video) {
        List<String> tags = videoTagRepository.findByIdVideoId(video.getId())
            .stream()
            .map(tag -> tag.getId().getTag())
            .toList();

        return new AdminVideoDetailResponse(
            video.getId(),
            video.getTitle(),
            video.getDescription(),
            video.getCategoryId(),
            tags,
            video.getSource().name(),
            video.getUploaderId(),
            video.getThumbnailUrl(),
            video.getLanguage(),
            video.getStatus().name(),
            video.getModerationNotes(),
            video.getReviewedBy(),
            video.getReviewedAt(),
            video.getPublishedAt(),
            video.getCreatedAt(),
            video.getUpdatedAt()
        );
    }

    private String buildUploadedPayload(Video video) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventId", UUID.randomUUID().toString());
        payload.put("videoId", video.getId());
        payload.put("title", video.getTitle());
        payload.put("description", video.getDescription());
        payload.put("tags", videoTagRepository.findByIdVideoId(video.getId()).stream().map(tag -> tag.getId().getTag()).toList());
        payload.put("categoryId", video.getCategoryId());
        payload.put("thumbnailUrl", video.getThumbnailUrl());
        payload.put("language", video.getLanguage());
        payload.put("source", video.getSource().name().toLowerCase());
        payload.put("timestamp", Instant.now().toString());

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize video.uploaded payload.");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
