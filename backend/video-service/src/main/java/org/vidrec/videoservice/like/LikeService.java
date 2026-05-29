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
    private final VideoReactionRepository videoReactionRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public LikeResponse recordLike(UUID userId, String videoId, LikeRequest request) {
        Video video = videoRepository.findById(videoId)
            .filter(v -> v.getStatus() == VideoStatus.READY)
            .orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND",
                "No video with id: " + videoId, List.of()));

        ReactionAction requestedAction = parseAction(request.action());
        VideoReactionId reactionId = new VideoReactionId(userId, videoId);
        VideoReaction existingReaction = videoReactionRepository.findById(reactionId).orElse(null);

        ReactionAction recordedAction;
        if (existingReaction == null) {
            incrementCounter(videoId, requestedAction);
            videoReactionRepository.save(VideoReaction.builder()
                .id(reactionId)
                .action(requestedAction)
                .build());
            recordedAction = requestedAction;
        } else if (existingReaction.getAction() == requestedAction) {
            decrementCounter(videoId, requestedAction);
            videoReactionRepository.delete(existingReaction);
            recordedAction = null;
        } else {
            decrementCounter(videoId, existingReaction.getAction());
            incrementCounter(videoId, requestedAction);
            existingReaction.setAction(requestedAction);
            videoReactionRepository.save(existingReaction);
            recordedAction = requestedAction;
        }

        if (recordedAction != null) {
            VideoLikedEvent event = VideoLikedEvent.create(
                userId.toString(),
                videoId,
                toResponseAction(recordedAction),
                video.getSource().name().toLowerCase()
            );

            outboxEventRepository.save(OutboxEvent.builder()
                .aggregateType("video")
                .aggregateId(videoId)
                .topic(TOPIC)
                .payload(serialize(event))
                .status(OUTBOX_PENDING)
                .build());
        }

        Video reloaded = videoRepository.findById(videoId).orElse(video);
        return new LikeResponse(
            videoId,
            toResponseAction(recordedAction),
            reloaded.getLikeCount(),
            reloaded.getDislikeCount(),
            LocalDateTime.now()
        );
    }

    @Transactional(readOnly = true)
    public LikeResponse getReaction(UUID userId, String videoId) {
        Video video = videoRepository.findById(videoId)
            .filter(v -> v.getStatus() == VideoStatus.READY)
            .orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND",
                "No video with id: " + videoId, List.of()));

        ReactionAction action = videoReactionRepository.findById(new VideoReactionId(userId, videoId))
            .map(VideoReaction::getAction)
            .orElse(null);

        return new LikeResponse(
            videoId,
            toResponseAction(action),
            video.getLikeCount(),
            video.getDislikeCount(),
            LocalDateTime.now()
        );
    }

    private ReactionAction parseAction(String action) {
        return "like".equals(action) ? ReactionAction.LIKE : ReactionAction.DISLIKE;
    }

    private String toResponseAction(ReactionAction action) {
        if (action == null) {
            return null;
        }
        return action.name().toLowerCase();
    }

    private void incrementCounter(String videoId, ReactionAction action) {
        if (action == ReactionAction.LIKE) {
            videoRepository.incrementLikeCount(videoId);
        } else {
            videoRepository.incrementDislikeCount(videoId);
        }
    }

    private void decrementCounter(String videoId, ReactionAction action) {
        if (action == ReactionAction.LIKE) {
            videoRepository.decrementLikeCount(videoId);
        } else {
            videoRepository.decrementDislikeCount(videoId);
        }
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
