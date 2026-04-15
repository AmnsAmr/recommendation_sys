package org.vidrec.userservice.kafka;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.vidrec.userservice.event.UserEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserEventPublisher {

    private static final String TOPIC = "user.events";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void publishAfterCommit(UserEvent event) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish(event);
                }
            });
            return;
        }
        publish(event);
    }

    private void publish(UserEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            String key = event.getUserId() != null ? event.getUserId().toString() : null;
            kafkaTemplate.send(TOPIC, key, payload);
        } catch (JacksonException e) {
            log.error("Failed to serialize user event: {}", event, e);
        }
    }
}
