package com.artha.expense.kafka;

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

    public void send(String topic, String key, Object event) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            log.debug("Transaction active, deferring Kafka send to afterCommit for topic: {}", topic);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doSend(topic, key, event);
                }
            });
        } else {
            log.debug("No active transaction, sending Kafka event immediately for topic: {}", topic);
            doSend(topic, key, event);
        }
    }

    private void doSend(String topic, String key, Object event) {
        kafkaTemplate.send(topic, key, event).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish event to topic: {} with key: {}", topic, key, ex);
            } else {
                log.debug("Successfully published event to topic: {} with key: {}", topic, key);
            }
        });
    }
}
