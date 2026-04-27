package org.vidrec.videoservice.watch;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface WatchSessionRepository extends JpaRepository<WatchSession, UUID> {
    List<WatchSession> findByUserIdAndVideoId(UUID userId, String videoId);
    long countByVideoId(String videoId);

    @Modifying
    @Query("delete from WatchSession w where w.videoId = :videoId")
    void deleteByVideoId(String videoId);
}