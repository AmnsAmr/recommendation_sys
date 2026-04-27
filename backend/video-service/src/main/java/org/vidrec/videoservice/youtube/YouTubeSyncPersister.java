package org.vidrec.videoservice.youtube;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.videoservice.outbox.OutboxEvent;
import org.vidrec.videoservice.outbox.OutboxEventRepository;
import org.vidrec.videoservice.video.Video;
import org.vidrec.videoservice.video.VideoRepository;
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
        int newCount = 0;
        for (YouTubeVideo source : videos) {
            if (videoRepository.existsById(source.youtubeId())) {
                continue;
            }
            Video saved = videoRepository.save(mapper.toEntity(source));
            for (String tag : source.tags()) {
                if (tag == null || tag.isBlank()) continue;
                videoTagRepository.save(VideoTag.builder()
                    .id(new VideoTagId(saved.getId(), tag))
                    .build());
            }
            outboxEventRepository.save(OutboxEvent.builder()
                .aggregateType(AGGREGATE_TYPE)
                .aggregateId(saved.getId())
                .topic(VIDEO_UPLOADED_TOPIC)
                .payload(mapper.toUploadedPayload(source))
                .status(OUTBOX_PENDING)
                .build());
            newCount++;
        }
        return newCount;
    }
}
