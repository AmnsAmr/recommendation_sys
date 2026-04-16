package org.vidrec.videoservice.video;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoTagRepository extends JpaRepository<VideoTag, VideoTagId> {
    List<VideoTag> findByIdVideoId(String videoId);
}
