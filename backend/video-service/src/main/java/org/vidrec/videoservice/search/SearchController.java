package org.vidrec.videoservice.search;

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
@RequestMapping("/videos/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @PostMapping("/click")
    public ResponseEntity<SearchAckResponse> recordClick(@Valid @RequestBody SearchClickRequest request) {
        UUID userId = authenticatedUserId();
        SearchAckResponse response = searchService.recordClick(userId, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    private UUID authenticatedUserId() {
        return UUID.fromString((String) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    }
}
