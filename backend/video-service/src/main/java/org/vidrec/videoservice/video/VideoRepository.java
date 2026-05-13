package org.vidrec.videoservice.video;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoRepository extends JpaRepository<Video, String> {
    Page<Video> findByStatusOrderByCreatedAtAsc(VideoStatus status, Pageable pageable);
    Page<Video> findByUploaderIdOrderByCreatedAtDesc(UUID uploaderId, Pageable pageable);
    long countByStatus(VideoStatus status);
    long countBySource(VideoSource source);
    long countByCreatedAtAfter(LocalDateTime createdAt);

    @Query("""
        select v from Video v
        where v.status = :status
          and (:categoryId is null or lower(v.categoryId) = lower(:categoryId))
          and (:source is null or v.source = :source)
          and (:language is null or lower(v.language) = lower(:language))
        order by coalesce(v.publishedAt, v.createdAt) desc
        """)
    Page<Video> findCatalog(
        @Param("status") VideoStatus status,
        @Param("categoryId") String categoryId,
        @Param("source") VideoSource source,
        @Param("language") String language,
        Pageable pageable
    );

    @Query("""
        select v from Video v
        where v.status = :status
          and (
            lower(v.title) like lower(concat('%', :query, '%'))
            or exists (
              select 1 from VideoTag vt
              where vt.id.videoId = v.id
                and lower(vt.id.tag) like lower(concat('%', :query, '%'))
            )
          )
        order by coalesce(v.publishedAt, v.createdAt) desc
        """)
    Page<Video> searchByQuery(@Param("status") VideoStatus status, @Param("query") String query, Pageable pageable);

    @Query("select coalesce(sum(v.viewCount), 0) from Video v")
    Long sumAllViews();
}
