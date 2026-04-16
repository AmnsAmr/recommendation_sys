package org.vidrec.userservice.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.vidrec.userservice.user.User;
import org.vidrec.userservice.user.UserRepository;
import org.vidrec.userservice.user.UserRole;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    @Value("${ADMIN_USERNAME:admin}")
    private String adminUsername;

    @Value("${ADMIN_DISPLAY_NAME:Platform Admin}")
    private String adminDisplayName;

    @Override
    public void run(ApplicationArguments args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.info("Admin bootstrap skipped because ADMIN_EMAIL or ADMIN_PASSWORD is not configured.");
            return;
        }
        if (userRepository.existsByEmail(adminEmail)) {
            log.info("Admin bootstrap skipped because {} already exists.", adminEmail);
            return;
        }

        User admin = User.builder()
            .email(adminEmail)
            .passwordHash(passwordEncoder.encode(adminPassword))
            .username(adminUsername)
            .displayName(adminDisplayName)
            .role(UserRole.ADMIN)
            .isActive(true)
            .build();
        userRepository.save(admin);
        log.info("Seeded initial admin account for {}.", adminEmail);
    }
}
