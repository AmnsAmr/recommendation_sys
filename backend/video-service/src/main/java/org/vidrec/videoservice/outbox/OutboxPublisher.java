package org.vidrec.videoservice.outbox;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.vidrec.videoservice.kafka.VideoEventProducer;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final VideoEventProducer videoEventProducer;

    @Scheduled(fixedDelay = 1000)
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
        if (pending.isEmpty()) {
            return;
        }
        log.info("Outbox poll: found {} pending events", pending.size());

        for (OutboxEvent event : pending) {
            publishSingle(event);
        }
    }

    private void publishSingle(OutboxEvent event) {
        try {
            videoEventProducer.send(event.getTopic(), event.getAggregateId(), event.getPayload())
                .get();

            event.setStatus("PUBLISHED");
            event.setPublishedAt(LocalDateTime.now());
            outboxEventRepository.save(event);
            log.info("Outbox event published: id={} topic={} aggregateId={}",
                event.getId(), event.getTopic(), event.getAggregateId());
        } catch (Exception ex) {
            log.error("Outbox event failed: id={} topic={} aggregateId={} payload={}",
                event.getId(), event.getTopic(), event.getAggregateId(), event.getPayload(), ex);
        }
    }
}
