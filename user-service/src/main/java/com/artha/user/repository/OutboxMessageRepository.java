package com.artha.user.repository;

import com.artha.user.entity.OutboxMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxMessageRepository extends JpaRepository<OutboxMessage, UUID> {
    List<OutboxMessage> findByStatus(String status);
    List<OutboxMessage> findByStatusAndCreatedAtBefore(String status, java.time.LocalDateTime dateTime);
}
