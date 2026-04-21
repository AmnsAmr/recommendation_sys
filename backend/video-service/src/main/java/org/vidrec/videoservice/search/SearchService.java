package org.vidrec.videoservice.search;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.videoservice.kafka.events.UserSearchedEvent;
import org.vidrec.videoservice.outbox.OutboxEvent;
import org.vidrec.videoservice.outbox.OutboxEventRepository;
import org.vidrec.videoservice.shared.exception.ApiException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private static final String TOPIC = "user.searched";
    private static final String OUTBOX_PENDING = "PENDING";

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public SearchAckResponse recordClick(UUID userId, SearchClickRequest request) {
        UserSearchedEvent event = UserSearchedEvent.create(
            userId.toString(),
            request.query().trim(),
            request.resultVideoIds(),
            request.clickedVideoId()
        );

        outboxEventRepository.save(OutboxEvent.builder()
            .aggregateType("user")
            .aggregateId(userId.toString())
            .topic(TOPIC)
            .payload(serialize(event))
            .status(OUTBOX_PENDING)
            .build());

        return new SearchAckResponse(true);
    }

    private String serialize(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException ex) {
            log.error("Failed to serialize search event", ex);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Failed to serialize event.", List.of());
        }
    }
}
