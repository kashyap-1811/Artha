package com.artha.budget.repository;

import com.artha.budget.entity.BudgetCategoryAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface BudgetCategoryAllocationRepository
        extends JpaRepository<BudgetCategoryAllocation, UUID> {

    List<BudgetCategoryAllocation> findAllByBudgetId(UUID budgetId);

    boolean existsByBudgetIdAndCategoryName(
            UUID budgetId,
            String categoryName
    );

    @Query("""
           SELECT COALESCE(SUM(bca.allocatedAmount), 0)
           FROM BudgetCategoryAllocation bca
           WHERE bca.budget.id = :budgetId
           """)
    BigDecimal sumAllocatedAmountByBudgetId(
            @Param("budgetId") UUID budgetId
    );
}