package org.vidrec.videoservice.watch;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WatchSessionRepository extends JpaRepository<WatchSession, UUID> {
    List<WatchSession> findByUserIdAndVideoId(UUID userId, String videoId);
    long countByVideoId(String videoId);
}