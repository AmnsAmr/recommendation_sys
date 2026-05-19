package org.vidrec.recommendationservice.model;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserCategoryProfileRepository extends JpaRepository<UserCategoryProfile, UUID> {
    List<UserCategoryProfile> findByUserId(UUID userId);
    List<UserCategoryProfile> findByUserIdAndSource(UUID userId, String source);
    void deleteByUserId(UUID userId);
    void deleteByUserIdAndSource(UUID userId, String source);
}
