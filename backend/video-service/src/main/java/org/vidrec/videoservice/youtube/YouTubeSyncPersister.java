package org.vidrec.videoservice.youtube;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.videoservice.outbox.OutboxEvent;
import org.vidrec.videoservice.outbox.OutboxEventRepository;
import org.vidrec.videoservice.video.Video;
import org.vidrec.videoservice.video.VideoRepository;
import org.vidrec.videoservice.video.VideoSource;
import org.vidrec.videoservice.video.VideoStatus;
import org.vidrec.videoservice.video.VideoTag;
import org.vidrec.videoservice.video.VideoTagId;
import org.vidrec.videoservice.video.VideoTagRepository;

@Component
@RequiredArgsConstructor
public class YouTubeSyncPersister {

    private static final String VIDEO_UPLOADED_TOPIC = "video.uploaded";
    private static final String OUTBOX_PENDING = "PENDING";
    private static final String AGGREGATE_TYPE = "video";

    private final VideoRepository videoRepository;
    private final VideoTagRepository videoTagRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final YouTubeVideoMapper mapper;

    @Transactional
    public int persistNewVideos(List<YouTubeVideo> videos) {
        int appliedCount = 0;
        for (YouTubeVideo source : videos) {
            Video desired = mapper.toEntity(source);
            List<String> desiredTags = normalizeTags(source.tags());
            Video existing = videoRepository.findById(source.youtubeId()).orElse(null);

            if (existing == null) {
                Video saved = videoRepository.save(desired);
                syncTags(saved.getId(), desiredTags);
                queueUploadedEvent(source);
                appliedCount++;
                continue;
            }

            if (existing.getSource() != VideoSource.YOUTUBE) {
                continue;
            }

            boolean metadataChanged = refreshVideoMetadata(existing, desired);
            boolean tagsChanged = syncTags(existing.getId(), desiredTags);

            if (metadataChanged) {
                videoRepository.save(existing);
            }

            if (metadataChanged || tagsChanged) {
                queueUploadedEvent(source);
                appliedCount++;
            }
        }
        return appliedCount;
    }

    private boolean refreshVideoMetadata(Video existing, Video desired) {
        boolean changed = false;

        changed |= setIfDifferent(existing.getTitle(), desired.getTitle(), existing::setTitle);
        changed |= setIfDifferent(existing.getDescription(), desired.getDescription(), existing::setDescription);
        changed |= setIfDifferent(existing.getCategoryId(), desired.getCategoryId(), existing::setCategoryId);
        changed |= setIfDifferent(existing.getDuration(), desired.getDuration(), existing::setDuration);
        changed |= setIfDifferent(existing.getYoutubeId(), desired.getYoutubeId(), existing::setYoutubeId);
        changed |= setIfDifferent(existing.getThumbnailUrl(), desired.getThumbnailUrl(), existing::setThumbnailUrl);
        changed |= setIfDifferent(existing.getLanguage(), desired.getLanguage(), existing::setLanguage);

        if (existing.getStatus() != VideoStatus.READY) {
            existing.setStatus(VideoStatus.READY);
            changed = true;
        }

        if (existing.getPublishedAt() == null) {
            existing.setPublishedAt(LocalDateTime.now());
            changed = true;
        }

        return changed;
    }

    private boolean syncTags(String videoId, List<String> desiredTags) {
        Set<String> currentTags = new LinkedHashSet<>(videoTagRepository.findByIdVideoId(videoId).stream()
                .map(videoTag -> videoTag.getId().getTag())
                .filter(tag -> tag != null && !tag.isBlank())
                .toList());
        Set<String> nextTags = new LinkedHashSet<>(desiredTags);

        if (currentTags.equals(nextTags)) {
            return false;
        }

        videoTagRepository.deleteByIdVideoId(videoId);
        nextTags.forEach(tag -> videoTagRepository.save(VideoTag.builder()
                .id(new VideoTagId(videoId, tag))
                .build()));
        return true;
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }

        return tags.stream()
                .filter(tag -> tag != null && !tag.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
    }

    private void queueUploadedEvent(YouTubeVideo source) {
        outboxEventRepository.save(OutboxEvent.builder()
                .aggregateType(AGGREGATE_TYPE)
                .aggregateId(source.youtubeId())
                .topic(VIDEO_UPLOADED_TOPIC)
                .payload(mapper.toUploadedPayload(source))
                .status(OUTBOX_PENDING)
                .build());
    }

    private <T> boolean setIfDifferent(T currentValue, T nextValue, java.util.function.Consumer<T> setter) {
        if (Objects.equals(currentValue, nextValue)) {
            return false;
        }

        setter.accept(nextValue);
        return true;
    }
}
