package org.vidrec.videoservice.video;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UploadTokenRepository extends JpaRepository<UploadToken, UUID> {
    Optional<UploadToken> findByVideoIdAndUsed(String videoId, boolean used);
}