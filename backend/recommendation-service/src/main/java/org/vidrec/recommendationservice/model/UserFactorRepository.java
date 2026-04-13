package org.vidrec.recommendationservice.model;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserFactorRepository extends JpaRepository<UserFactor, UUID> {
    Optional<UserFactor> findByUserId(UUID userId);
}