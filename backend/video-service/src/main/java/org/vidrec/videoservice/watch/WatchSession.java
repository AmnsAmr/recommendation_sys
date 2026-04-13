package org.vidrec.videoservice.watch;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.vidrec.videoservice.video.VideoSource;

@Entity
@Table(name = "watch_sessions", schema = "video_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WatchSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "video_id", nullable = false, length = 100)
    private String videoId;

    @Column(name = "watch_duration", nullable = false)
    private Integer watchDuration;

    @Column(name = "video_duration", nullable = false)
    private Integer videoDuration;

    @Column(name = "completion_pct", nullable = false)
    private Double completionPct;

    @Column(name = "rewatch_count", nullable = false)
    private Integer rewatchCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VideoSource source;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}