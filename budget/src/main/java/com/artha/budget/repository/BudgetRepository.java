package com.artha.budget.repository;

import com.artha.budget.entity.Budget;
import com.artha.budget.entity.BudgetStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {

    /**
     * Get active budget for a company
     * (At most ONE active budget should exist)
     */
    Optional<Budget> findByCompanyIdAndStatus(
            String companyId,
            BudgetStatus status
    );

    /**
     * Check overlapping budgets for same company
     * Used while creating new budget
     */
    boolean existsByCompanyIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            String companyId,
            BudgetStatus status,
            LocalDate endDate,
            LocalDate startDate
    );

    /**
     * Fetch all budgets for company (history)
     */
    List<Budget> findAllByCompanyIdOrderByStartDateDesc(String companyId);
}