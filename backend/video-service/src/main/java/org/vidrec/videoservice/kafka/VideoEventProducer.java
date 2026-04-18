package org.vidrec.videoservice.kafka;

import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class VideoEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;

    public CompletableFuture<SendResult<String, String>> send(String topic, String key, String payload) {
        log.debug("Publishing to topic={} key={}", topic, key);
        return kafkaTemplate.send(topic, key, payload)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish to topic={} key={} payload={}", topic, key, payload, ex);
                } else {
                    log.info("Published to topic={} key={} offset={}",
                        topic, key, result.getRecordMetadata().offset());
                }
            });
    }
}
