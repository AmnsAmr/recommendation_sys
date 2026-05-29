package org.vidrec.videoservice.like;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoReactionRepository extends JpaRepository<VideoReaction, VideoReactionId> {
}
