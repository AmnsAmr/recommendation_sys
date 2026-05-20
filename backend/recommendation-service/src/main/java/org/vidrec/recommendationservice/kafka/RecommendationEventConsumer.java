package org.vidrec.recommendationservice.kafka;

import tools.jackson.databind.ObjectMapper;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.vidrec.recommendationservice.interaction.InteractionService;
import org.vidrec.recommendationservice.kafka.events.*;
import org.vidrec.recommendationservice.model.ItemFactorService;
import org.vidrec.recommendationservice.model.ProcessedEventService;
import org.vidrec.recommendationservice.model.UserCategoryProfileService;
import org.vidrec.recommendationservice.cache.RecommendationCacheService;

@Slf4j
@Component
@RequiredArgsConstructor
public class RecommendationEventConsumer {

    private final ProcessedEventService processedEventService;
    private final InteractionService interactionService;
    private final ItemFactorService itemFactorService;
    private final UserCategoryProfileService userCategoryProfileService;
    private final RecommendationCacheService recommendationCacheService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "video.watched", groupId = "recommendation-group")
    public void onVideoWatched(String payload) throws Exception {
        VideoWatchedEvent event = objectMapper.readValue(payload, VideoWatchedEvent.class);
        log.info("Received video.watched event: {}", event.eventId());
        
        if (processedEventService.existsByEventId(event.eventId())) {
            log.warn("Event {} already processed, skipping", event.eventId());
            return;
        }

        try {
            interactionService.insertWatchInteraction(event);
            itemFactorService.incrementViewCount(event.videoId());
            recommendationCacheService.invalidate(UUID.fromString(event.userId()));
            
            processedEventService.save(event.eventId());
            log.info("Successfully processed video.watched event: {}", event.eventId());
        } catch (Exception e) {
            log.error("Error processing video.watched event: {}", event.eventId(), e);
            throw e;
        }
    }

    @KafkaListener(topics = "video.liked", groupId = "recommendation-group")
    public void onVideoLiked(String payload) throws Exception {
        VideoLikedEvent event = objectMapper.readValue(payload, VideoLikedEvent.class);
        log.info("Received video.liked event: {}", event.eventId());
        
        if (processedEventService.existsByEventId(event.eventId())) {
            return;
        }

        try {
            interactionService.insertLikeInteraction(event);
            recommendationCacheService.invalidate(UUID.fromString(event.userId()));
            
            processedEventService.save(event.eventId());
            log.info("Successfully processed video.liked event: {}", event.eventId());
        } catch (Exception e) {
            log.error("Error processing video.liked event: {}", event.eventId(), e);
            throw e;
        }
    }

    @KafkaListener(topics = "user.searched", groupId = "recommendation-group")
    public void onUserSearched(String payload) throws Exception {
        UserSearchedEvent event = objectMapper.readValue(payload, UserSearchedEvent.class);
        log.info("Received user.searched event: {}", event.eventId());
        
        if (processedEventService.existsByEventId(event.eventId())) {
            return;
        }

        try {
            if (event.clickedVideoId() != null) {
                interactionService.insertSearchInteraction(event);
            }
            processedEventService.save(event.eventId());
            log.info("Successfully processed user.searched event: {}", event.eventId());
        } catch (Exception e) {
            log.error("Error processing user.searched event: {}", event.eventId(), e);
            throw e;
        }
    }

    @KafkaListener(topics = "video.uploaded", groupId = "recommendation-group")
    public void onVideoUploaded(String payload) throws Exception {
        VideoUploadedEvent event = objectMapper.readValue(payload, VideoUploadedEvent.class);
        log.info("Received video.uploaded event: {}", event.eventId());
        
        if (processedEventService.existsByEventId(event.eventId())) {
            return;
        }

        try {
            itemFactorService.upsert(
                event.videoId(),
                event.tags(),
                event.categoryId(),
                event.thumbnailUrl(),
                event.language()
            );
            processedEventService.save(event.eventId());
            log.info("Successfully processed video.uploaded event: {}", event.eventId());
        } catch (Exception e) {
            log.error("Error processing video.uploaded event: {}", event.eventId(), e);
            throw e;
        }
    }

    @KafkaListener(topics = "user.events", groupId = "recommendation-group")
    public void onUserEvent(String payload) throws Exception {
        UserEvent event = objectMapper.readValue(payload, UserEvent.class);
        log.info("Received user.events event: {} type={}", event.eventId(), event.eventType());
        
        if (processedEventService.existsByEventId(event.eventId())) {
            return;
        }

        try {
            UUID userId = UUID.fromString(event.userId());
            switch (event.eventType()) {
                case "registered":
                    userCategoryProfileService.insertDeclared(userId, event.interests());
                    break;
                case "prefs_updated":
                    userCategoryProfileService.replaceDeclared(userId, event.preferences());
                    break;
                case "banned":
                case "deactivated":
                case "deleted":
                    recommendationCacheService.invalidate(userId);
                    break;
                default:
                    log.warn("Unknown user event type: {}", event.eventType());
            }
            
            processedEventService.save(event.eventId());
            log.info("Successfully processed user.events event: {}", event.eventId());
        } catch (Exception e) {
            log.error("Error processing user.events event: {}", event.eventId(), e);
            throw e;
        }
    }
}
