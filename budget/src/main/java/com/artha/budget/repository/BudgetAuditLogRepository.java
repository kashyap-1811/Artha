package com.artha.budget.repository;

import com.artha.budget.entity.BudgetAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BudgetAuditLogRepository extends JpaRepository<BudgetAuditLog, UUID> {

    List<BudgetAuditLog> findByBudgetIdOrderByCreatedAtDesc(UUID budgetId);

    List<BudgetAuditLog> findByUserIdOrderByCreatedAtDesc(String userId);
}
