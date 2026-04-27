package org.vidrec.videoservice.youtube;

import org.springframework.data.jpa.repository.JpaRepository;

public interface YouTubeSyncStateRepository extends JpaRepository<YouTubeSyncState, String> {
}
