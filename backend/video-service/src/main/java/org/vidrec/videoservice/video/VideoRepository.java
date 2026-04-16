package org.vidrec.videoservice.video;

import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VideoRepository extends JpaRepository<Video, String> {
    Page<Video> findByStatusOrderByCreatedAtAsc(VideoStatus status, Pageable pageable);
    long countByStatus(VideoStatus status);
    long countBySource(VideoSource source);
    long countByCreatedAtAfter(LocalDateTime createdAt);

    @Query("select coalesce(sum(v.viewCount), 0) from Video v")
    Long sumAllViews();
}
