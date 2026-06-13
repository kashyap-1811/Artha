package com.artha.budget.kafka;

import com.artha.budget.entity.OutboxMessage;
import com.artha.budget.repository.OutboxMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
@Slf4j
@RequiredArgsConstructor
public class KafkaEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final OutboxMessageRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public void send(String topic, String key, Object event) {
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            log.error("Failed to serialize Kafka event payload for topic: {}", topic, e);
            return;
        }

        // 1. Create and Save Outbox Message (Transactional Outbox)
        OutboxMessage outbox = OutboxMessage.builder()
                .topic(topic)
                .key(key)
                .payload(payloadJson)
                .status("PENDING")
                .build();
        
        outboxRepository.save(outbox);

        // 2. Publish to Kafka post-commit or immediately
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            log.debug("Transaction active, deferring Kafka send to afterCommit for topic: {}", topic);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doSend(outbox, event);
                }
            });
        } else {
            log.debug("No active transaction, sending Kafka event immediately for topic: {}", topic);
            doSend(outbox, event);
        }
    }

    private void doSend(OutboxMessage outbox, Object event) {
        try {
            kafkaTemplate.send(outbox.getTopic(), outbox.getKey(), event).whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish event to topic: {} with key: {}. Leaving in Outbox.", outbox.getTopic(), outbox.getKey(), ex);
                    outbox.setStatus("FAILED");
                    outboxRepository.save(outbox);
                } else {
                    log.debug("Successfully published event to topic: {} with key: {}", outbox.getTopic(), outbox.getKey());
                    outboxRepository.delete(outbox); // Success: clean database
                }
            });
        } catch (Exception e) {
            log.error("Exception thrown during kafkaTemplate.send for topic: {} with key: {}. Leaving in Outbox.", outbox.getTopic(), outbox.getKey(), e);
            outbox.setStatus("FAILED");
            outboxRepository.save(outbox);
        }
    }
}
