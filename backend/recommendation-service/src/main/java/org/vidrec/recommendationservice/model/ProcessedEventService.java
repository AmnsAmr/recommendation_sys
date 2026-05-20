package org.vidrec.recommendationservice.model;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProcessedEventService {

    private final ProcessedEventRepository processedEventRepository;

    @Transactional(readOnly = true)
    public boolean existsByEventId(String eventId) {
        return processedEventRepository.existsByEventId(eventId);
    }

    @Transactional
    public void save(String eventId) {
        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(eventId)
                .processedAt(LocalDateTime.now())
                .build());
    }
}
