package org.vidrec.videoservice.video;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoTagRepository extends JpaRepository<VideoTag, VideoTagId> {
}