package org.vidrec.userservice.preference;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, UUID> {
    List<UserPreference> findByUserId(UUID userId);
    void deleteByUserId(UUID userId);
}