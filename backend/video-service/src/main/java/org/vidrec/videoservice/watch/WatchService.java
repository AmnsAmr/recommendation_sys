package org.vidrec.videoservice.watch;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.videoservice.kafka.events.VideoWatchedEvent;
import org.vidrec.videoservice.outbox.OutboxEvent;
import org.vidrec.videoservice.outbox.OutboxEventRepository;
import org.vidrec.videoservice.shared.exception.ApiException;
import org.vidrec.videoservice.video.Video;
import org.vidrec.videoservice.video.VideoRepository;
import org.vidrec.videoservice.video.VideoSource;
import org.vidrec.videoservice.video.VideoStatus;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class WatchService {

    private static final String TOPIC = "video.watched";
    private static final String OUTBOX_PENDING = "PENDING";

    private final WatchSessionRepository watchSessionRepository;
    private final VideoRepository videoRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public WatchAckResponse recordWatch(UUID userId, WatchRequest request) {
        Video video = videoRepository.findById(request.videoId())
            .filter(v -> v.getStatus() == VideoStatus.READY)
            .orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND",
                "No video with id: " + request.videoId(), List.of()));

        VideoSource source = parseSource(request.source());

        watchSessionRepository.save(WatchSession.builder()
            .userId(userId)
            .videoId(video.getId())
            .watchDuration(request.watchDuration())
            .videoDuration(request.videoDuration())
            .completionPct(request.completionPct())
            .rewatchCount(0)
            .source(source)
            .build());

        videoRepository.incrementViewCount(video.getId());

        VideoWatchedEvent event = VideoWatchedEvent.create(
            userId.toString(),
            video.getId(),
            request.watchDuration(),
            request.videoDuration(),
            request.completionPct().floatValue(),
            source.name().toLowerCase()
        );

        outboxEventRepository.save(OutboxEvent.builder()
            .aggregateType("video")
            .aggregateId(video.getId())
            .topic(TOPIC)
            .payload(serialize(event))
            .status(OUTBOX_PENDING)
            .build());

        return new WatchAckResponse(true);
    }

    private VideoSource parseSource(String source) {
        try {
            return VideoSource.valueOf(source.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Invalid source: " + source, List.of());
        }
    }

    private String serialize(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException ex) {
            log.error("Failed to serialize watch event", ex);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Failed to serialize event.", List.of());
        }
    }
}
