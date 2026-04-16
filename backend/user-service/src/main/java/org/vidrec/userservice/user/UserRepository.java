package org.vidrec.userservice.user;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Page<User> findByRole(UserRole role, Pageable pageable);
    Page<User> findByIsActive(boolean isActive, Pageable pageable);
    Page<User> findByRoleAndIsActive(UserRole role, boolean isActive, Pageable pageable);
    long countByIsActive(boolean isActive);
    long countByBannedAtIsNotNull();
    long countByRole(UserRole role);
    long countByCreatedAtAfter(LocalDateTime createdAt);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}
