package org.vidrec.recommendationservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "item_factors", schema = "recommendation_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemFactor {

    @Id
    @Column(name = "video_id", length = 100)
    private String videoId;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "float[]")
    private Double[] vector;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private String[] tags;

    @Column(name = "category_id")
    private String categoryId;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column
    private String language;

    @Column(name = "view_count", nullable = false)
    private Long viewCount = 0L;

    @Column(name = "global_score", nullable = false)
    private Double globalScore = 0.0;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}