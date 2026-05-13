package org.vidrec.videoservice.like;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.videoservice.kafka.events.VideoLikedEvent;
import org.vidrec.videoservice.outbox.OutboxEvent;
import org.vidrec.videoservice.outbox.OutboxEventRepository;
import org.vidrec.videoservice.shared.exception.ApiException;
import org.vidrec.videoservice.video.Video;
import org.vidrec.videoservice.video.VideoRepository;
import org.vidrec.videoservice.video.VideoStatus;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class LikeService {

    private static final String TOPIC = "video.liked";
    private static final String OUTBOX_PENDING = "PENDING";

    private final VideoRepository videoRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public LikeResponse recordLike(UUID userId, String videoId, LikeRequest request) {
        Video video = videoRepository.findById(videoId)
            .filter(v -> v.getStatus() == VideoStatus.READY)
            .orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND",
                "No video with id: " + videoId, List.of()));

        String action = request.action();
        if ("like".equals(action)) {
            videoRepository.incrementLikeCount(videoId);
        } else {
            videoRepository.incrementDislikeCount(videoId);
        }

        VideoLikedEvent event = VideoLikedEvent.create(
            userId.toString(),
            videoId,
            action,
            video.getSource().name().toLowerCase()
        );

        outboxEventRepository.save(OutboxEvent.builder()
            .aggregateType("video")
            .aggregateId(videoId)
            .topic(TOPIC)
            .payload(serialize(event))
            .status(OUTBOX_PENDING)
            .build());

        Video reloaded = videoRepository.findById(videoId).orElse(video);
        return new LikeResponse(
            videoId,
            action,
            reloaded.getLikeCount(),
            reloaded.getDislikeCount(),
            LocalDateTime.now()
        );
    }

    private String serialize(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException ex) {
            log.error("Failed to serialize like event", ex);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Failed to serialize event.", List.of());
        }
    }
}
