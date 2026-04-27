package org.vidrec.videoservice.youtube;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "youtube_sync_state", schema = "video_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YouTubeSyncState {

    public static final String SINGLETON_ID = "default";

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "last_successful_run_at")
    private LocalDateTime lastSuccessfulRunAt;

    @Column(name = "last_quota_hit_at")
    private LocalDateTime lastQuotaHitAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;
}
