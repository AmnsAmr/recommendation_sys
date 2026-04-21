package org.vidrec.videoservice.video;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoRepository extends JpaRepository<Video, String> {
    Page<Video> findByStatusOrderByCreatedAtAsc(VideoStatus status, Pageable pageable);
    long countByStatus(VideoStatus status);
    long countBySource(VideoSource source);
    long countByCreatedAtAfter(LocalDateTime createdAt);

    @Query("select coalesce(sum(v.viewCount), 0) from Video v")
    Long sumAllViews();

    Page<Video> findByUploaderIdAndStatusOrderByCreatedAtDesc(
        UUID uploaderId, VideoStatus status, Pageable pageable);

    @Query("""
        select distinct v from Video v
        left join VideoTag t on t.id.videoId = v.id
        where v.status = :status
          and (lower(v.title) like lower(concat('%', :q, '%'))
               or lower(t.id.tag) like lower(concat('%', :q, '%')))
        order by v.createdAt desc
        """)
    Page<Video> search(
        @Param("q") String query,
        @Param("status") VideoStatus status,
        Pageable pageable);

    @Query("""
        select v from Video v
        where v.status = :status
          and (:categoryId is null or v.categoryId = :categoryId)
          and (:source is null or v.source = :source)
          and (:language is null or v.language = :language)
        order by v.createdAt desc
        """)
    Page<Video> findCatalog(
        @Param("status") VideoStatus status,
        @Param("categoryId") String categoryId,
        @Param("source") VideoSource source,
        @Param("language") String language,
        Pageable pageable);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Video v set v.viewCount = v.viewCount + 1 where v.id = :videoId")
    int incrementViewCount(@Param("videoId") String videoId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Video v set v.likeCount = v.likeCount + 1 where v.id = :videoId")
    int incrementLikeCount(@Param("videoId") String videoId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Video v set v.dislikeCount = v.dislikeCount + 1 where v.id = :videoId")
    int incrementDislikeCount(@Param("videoId") String videoId);
}
