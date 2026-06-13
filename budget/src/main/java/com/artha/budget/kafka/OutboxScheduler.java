package com.artha.budget.kafka;

import com.artha.budget.entity.OutboxMessage;
import com.artha.budget.repository.OutboxMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
@RequiredArgsConstructor
public class OutboxScheduler {

    private final OutboxMessageRepository outboxRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelay = 10000) // Poll every 10 seconds
    @Transactional
    public void processOutbox() {
        List<OutboxMessage> failedMessages = outboxRepository.findByStatus("FAILED");
        List<OutboxMessage> pendingMessages = outboxRepository.findByStatusAndCreatedAtBefore(
                "PENDING", java.time.LocalDateTime.now().minusSeconds(10)
        );
        
        failedMessages.addAll(pendingMessages);

        if (failedMessages.isEmpty()) {
            return;
        }

        log.info("Found {} pending/failed outbox messages. Retrying publish...", failedMessages.size());

        for (OutboxMessage message : failedMessages) {
            try {
                Object payload = objectMapper.readValue(message.getPayload(), Object.class);

                // Synchronous wait to ensure transactional safety during processing loop
                kafkaTemplate.send(message.getTopic(), message.getKey(), payload).get(5, TimeUnit.SECONDS);

                log.info("Successfully republished outbox message ID {} to topic {}", message.getId(), message.getTopic());
                outboxRepository.delete(message);
            } catch (Exception e) {
                log.error("Failed to republish outbox message {}: {}", message.getId(), e.getMessage());
                message.setStatus("FAILED");
                message.setRetryCount(message.getRetryCount() + 1);
                outboxRepository.save(message);
            }
        }
    }
}
