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
            String userId,
            String companyId,
            String name,
            BigDecimal totalAmount,
            LocalDate startDate,
            LocalDate endDate
    );

    Budget getActiveBudget(String userId, String companyId);

    List<Budget> getAllBudgets(String userId, String companyId);

    void closeBudget(String userId, UUID budgetId);

    /* ---------- Allocations ---------- */

    BudgetCategoryAllocation addCategoryAllocation(
            String userId,
            UUID budgetId,
            String categoryName,
            BigDecimal allocatedAmount,
            Integer alertThreshold
    );

    void removeCategoryAllocation(
            String userId,
            UUID budgetId,
            UUID allocationId
    );

    BudgetCategoryAllocation updateAllocation(String userId, UUID budgetId, UUID allocationId, UpdateAllocationRequestDTO request);

    Budget updateBudget(String userId, UUID budgetId, UpdateBudgetRequestDTO request);

    void removeBudget(String userId, UUID budgetId);

    BudgetResponseDTO getAllDetailOfBudget(String userId, UUID budgetId);
}