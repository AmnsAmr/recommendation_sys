package org.vidrec.recommendationservice.interaction;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.recommendationservice.kafka.events.VideoLikedEvent;
import org.vidrec.recommendationservice.kafka.events.VideoWatchedEvent;
import org.vidrec.recommendationservice.kafka.events.UserSearchedEvent;

@Slf4j
@Service
@RequiredArgsConstructor
public class InteractionService {

    private final InteractionRepository interactionRepository;

    @Transactional
    public void insertWatchInteraction(VideoWatchedEvent event) {
        UUID userId = UUID.fromString(event.userId());
        String videoId = event.videoId();
        double completionPct = event.completionPct();

        double score = calculateWatchScore(completionPct);
        boolean isRewatch = interactionRepository.existsByUserIdAndVideoId(userId, videoId);
        
        EventType eventType = EventType.WATCH;
        if (isRewatch) {
            score += 0.2;
            eventType = EventType.REWATCH;
        }

        saveInteraction(userId, videoId, eventType, score, completionPct);
    }

    @Transactional
    public void insertLikeInteraction(VideoLikedEvent event) {
        UUID userId = UUID.fromString(event.userId());
        String videoId = event.videoId();
        String action = event.action();

        double score = "like".equalsIgnoreCase(action) ? 1.0 : -1.0;
        EventType eventType = "like".equalsIgnoreCase(action) ? EventType.LIKE : EventType.DISLIKE;

        saveInteraction(userId, videoId, eventType, score, null);
    }

    @Transactional
    public void insertSearchInteraction(UserSearchedEvent event) {
        if (event.clickedVideoId() == null) {
            return;
        }

        UUID userId = UUID.fromString(event.userId());
        String videoId = event.clickedVideoId();
        double score = 0.5;
        EventType eventType = EventType.SEARCH_CLICK;

        saveInteraction(userId, videoId, eventType, score, null);
    }

    private double calculateWatchScore(double completionPct) {
        if (completionPct < 0.20) {
            return 0.1;
        } else if (completionPct <= 0.60) {
            return completionPct * 0.8;
        } else {
            return completionPct * 1.0;
        }
    }

    private void saveInteraction(UUID userId, String videoId, EventType eventType, double score, Double completionPct) {
        Interaction interaction = Interaction.builder()
                .userId(userId)
                .videoId(videoId)
                .eventType(eventType)
                .score(score)
                .completionPct(completionPct)
                .createdAt(LocalDateTime.now())
                .build();
        interactionRepository.save(interaction);
    }
}
