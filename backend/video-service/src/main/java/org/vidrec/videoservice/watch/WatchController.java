package org.vidrec.videoservice.watch;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/videos")
@RequiredArgsConstructor
public class WatchController {

    private final WatchService watchService;

    @PostMapping("/watch")
    public ResponseEntity<WatchAckResponse> recordWatch(@Valid @RequestBody WatchRequest request) {
        UUID userId = authenticatedUserId();
        WatchAckResponse response = watchService.recordWatch(userId, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    private UUID authenticatedUserId() {
        return UUID.fromString((String) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    }
}
