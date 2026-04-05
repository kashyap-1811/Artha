package com.artha.budget.controller;

import com.artha.budget.dto.request.AddAllocationRequestDTO;
import com.artha.budget.dto.request.CreateBudgetRequestDTO;
import com.artha.budget.dto.request.UpdateAllocationRequestDTO;
import com.artha.budget.dto.request.UpdateBudgetRequestDTO;
import com.artha.budget.dto.response.BudgetAllocationResponseDTO;
import com.artha.budget.dto.response.BudgetResponseDTO;
import com.artha.budget.entity.Budget;
import com.artha.budget.entity.BudgetCategoryAllocation;
import com.artha.budget.mapper.BudgetMapper;
import com.artha.budget.service.BudgetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    /* ===================== Budget ===================== */

    /**
     * Create a new budget.
     * Requires: OWNER role.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BudgetResponseDTO createBudget(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody CreateBudgetRequestDTO request
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            Budget budget = budgetService.createBudget(
                    userId,
                    request.getCompanyId(),
                    request.getName(),
                    request.getTotalAmount(),
                    request.getStartDate(),
                    request.getEndDate()
            );

            return BudgetMapper.toBudgetResponse(budget);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Create Budget]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /**
     * Get active budget for a company.
     * Open to all company members.
     */
    @GetMapping("/active")
    public List<BudgetResponseDTO> getActiveBudget(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String companyId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return budgetService.getActiveBudget(userId, companyId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Active Budget]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /**
     * Get all budgets (history) for a company.
     * Open to all company members.
     */
    @GetMapping("/all")
    public List<BudgetResponseDTO> getAllBudgets(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String companyId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return budgetService.getAllBudgets(userId, companyId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get All Budgets]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /**
     * Close a budget.
     * Requires: OWNER role.
     */
    @PostMapping("/{budgetId}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void closeBudget(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            budgetService.closeBudget(userId, budgetId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Close Budget]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ===================== Allocations ===================== */

    /**
     * Add category allocation to a budget.
     * Requires: OWNER or MEMBER role.
     */
    @PostMapping("/{budgetId}/allocations")
    @ResponseStatus(HttpStatus.CREATED)
    public BudgetAllocationResponseDTO addAllocation(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId,
            @RequestBody AddAllocationRequestDTO request
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            BudgetCategoryAllocation allocation =
                    budgetService.addCategoryAllocation(
                            userId,
                            budgetId,
                            request.getCategoryName(),
                            request.getAllocatedAmount(),
                            request.getAlertThreshold()
                    );

            return BudgetMapper.toAllocationResponse(allocation);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Add Allocation]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /**
     * Remove category allocation from budget.
     * Requires: OWNER or MEMBER role.
     */
    @DeleteMapping("/{budgetId}/allocations/{allocationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeAllocation(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId,
            @PathVariable UUID allocationId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            budgetService.removeCategoryAllocation(userId, budgetId, allocationId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Remove Allocation]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /**
     * Update allocation.
     * Requires: OWNER or MEMBER role.
     */
    @PutMapping("/{budgetId}/allocations/{allocationId}")
    public BudgetAllocationResponseDTO updateAllocation(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId,
            @PathVariable UUID allocationId,
            @RequestBody UpdateAllocationRequestDTO request) {
        long serviceStart = System.currentTimeMillis();
        try {
            BudgetCategoryAllocation allocation =
                    budgetService.updateAllocation(userId, budgetId, allocationId, request);

            return BudgetMapper.toAllocationResponse(allocation);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Update Allocation]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /**
     * Update budget metadata.
     * Requires: OWNER role.
     */
    @PutMapping("/{budgetId}")
    public BudgetResponseDTO updateBudget(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId,
            @RequestBody UpdateBudgetRequestDTO request) {
        long serviceStart = System.currentTimeMillis();
        try {
            Budget budget = budgetService.updateBudget(userId, budgetId, request);
            return BudgetMapper.toBudgetResponse(budget);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Update Budget]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /**
     * Delete (close) budget.
     * Requires: OWNER role.
     */
    @DeleteMapping("/{budgetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeBudget(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId) {
        long serviceStart = System.currentTimeMillis();
        try {
            budgetService.removeBudget(userId, budgetId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Remove Budget]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    @GetMapping("/{budgetId}/details")
    public BudgetResponseDTO getAllDetailOfBudget(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return budgetService.getAllDetailOfBudget(userId, budgetId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get All Detail Of Budget]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }
}