package org.vidrec.videoservice.video;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "videos", schema = "video_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Video {

    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column
    private String description;

    @Column(name = "category_id", nullable = false)
    private String categoryId;

    @Column
    private Integer duration;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VideoSource source;

    @Column(name = "youtube_id")
    private String youtubeId;

    @Column(name = "uploader_id")
    private UUID uploaderId;

    @Column(name = "s3_key")
    private String s3Key;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "view_count", nullable = false)
    private Long viewCount = 0L;

    @Column(name = "like_count", nullable = false)
    private Long likeCount = 0L;

    @Column(name = "dislike_count", nullable = false)
    private Long dislikeCount = 0L;

    @Column
    private String language;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VideoStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}