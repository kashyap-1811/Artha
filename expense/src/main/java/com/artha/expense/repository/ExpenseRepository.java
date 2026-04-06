package com.artha.expense.repository;

import com.artha.expense.dto.BudgetExpenseSummaryResponse;
import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
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

    /**
     * Collapses 3 summary queries into 1 using conditional aggregation (CASE WHEN).
     * Part 2 Optimization: Reduces database round-trips from 4 to 1.
     */
    @Query("""
        SELECT new com.artha.expense.dto.BudgetExpenseSummaryResponse(
            e.budgetId,
            COALESCE(SUM(CASE WHEN e.status = 'APPROVED' THEN e.amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN e.status = 'PENDING' THEN e.amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN e.status = 'REJECTED' THEN e.amount ELSE 0 END), 0)
        )
        FROM Expense e
        WHERE e.budgetId = :budgetId
        GROUP BY e.budgetId
    """)
    Optional<BudgetExpenseSummaryResponse> getSummaryByBudgetId(@Param("budgetId") UUID budgetId);
}