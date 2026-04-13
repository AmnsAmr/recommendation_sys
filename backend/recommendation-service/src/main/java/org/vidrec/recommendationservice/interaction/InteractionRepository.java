package org.vidrec.recommendationservice.interaction;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InteractionRepository extends JpaRepository<Interaction, UUID> {
    List<Interaction> findByUserId(UUID userId);
    List<Interaction> findByVideoId(String videoId);
    long countByUserId(UUID userId);
    List<Interaction> findByUserIdAndVideoId(UUID userId, String videoId);
}