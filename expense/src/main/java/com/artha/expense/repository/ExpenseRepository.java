package com.artha.expense.repository;

import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    List<Expense> findByCompanyId(String companyId);

    List<Expense> findByCompanyIdAndStatus(
            String companyId,
            ExpenseStatus status
    );

    List<Expense> findByCompanyIdAndSpentDateBetweenAndStatus(
            String companyId,
            LocalDate startDate,
            LocalDate endDate,
            ExpenseStatus status
    );

    List<Expense> findByBudgetId(UUID budgetId);

    List<Expense> findByAllocationId(UUID allocationId);

    @Query("""
       SELECT COALESCE(SUM(e.amount), 0)
       FROM Expense e
       WHERE e.allocationId = :allocationId
       AND e.status = 'APPROVED'
       """)
    BigDecimal sumApprovedAmountByAllocationId(UUID allocationId);

    @Query("""
       SELECT COALESCE(SUM(e.amount), 0)
       FROM Expense e
       WHERE e.budgetId = :budgetId
       AND e.status = 'APPROVED'
       """)
    BigDecimal sumApprovedByBudgetId(UUID budgetId);

    @Query("""
       SELECT COALESCE(SUM(e.amount), 0)
       FROM Expense e
       WHERE e.budgetId = :budgetId
       AND e.status = 'PENDING'
       """)
    BigDecimal sumPendingByBudgetId(UUID budgetId);

    @Query("""
       SELECT COALESCE(SUM(e.amount), 0)
       FROM Expense e
       WHERE e.budgetId = :budgetId
       AND e.status = 'REJECTED'
       """)
    BigDecimal sumRejectedByBudgetId(UUID budgetId);
}