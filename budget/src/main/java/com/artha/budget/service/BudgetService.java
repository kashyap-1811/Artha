package com.artha.budget.service;

import com.artha.budget.dto.request.UpdateAllocationRequestDTO;
import com.artha.budget.dto.request.UpdateBudgetRequestDTO;
import com.artha.budget.dto.response.BudgetResponseDTO;
import com.artha.budget.entity.Budget;
import com.artha.budget.entity.BudgetCategoryAllocation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface BudgetService {

    /* ---------- Budget ---------- */

    Budget createBudget(
            String companyId,
            String name,
            BigDecimal totalAmount,
            LocalDate startDate,
            LocalDate endDate
    );

    Budget getActiveBudget(String companyId);

    List<Budget> getAllBudgets(String companyId);

    void closeBudget(UUID budgetId);

    /* ---------- Allocations ---------- */

    BudgetCategoryAllocation addCategoryAllocation(
            UUID budgetId,
            String categoryName,
            BigDecimal allocatedAmount,
            Integer alertThreshold
    );

    void removeCategoryAllocation(
            UUID budgetId,
            UUID allocationId
    );

    BudgetCategoryAllocation updateAllocation(UUID budgetId, UUID allocationId, UpdateAllocationRequestDTO request);

    Budget updateBudget(UUID budgetId, UpdateBudgetRequestDTO request);

    void removeBudget(UUID budgetId);

    BudgetResponseDTO getAllDetailOfBudget(UUID budgetId);
}