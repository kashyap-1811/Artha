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
        Budget budget = budgetService.createBudget(
                userId,
                request.getCompanyId(),
                request.getName(),
                request.getTotalAmount(),
                request.getStartDate(),
                request.getEndDate()
        );

        return BudgetMapper.toBudgetResponse(budget);
    }

    /**
     * Get active budget for a company.
     * Open to all company members.
     */
    @GetMapping("/active")
    public BudgetResponseDTO getActiveBudget(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String companyId
    ) {
        Budget budget = budgetService.getActiveBudget(userId, companyId);
        return BudgetMapper.toBudgetResponse(budget);
    }

    /**
     * Get all budgets (history) for a company.
     * Open to all company members.
     */
    @GetMapping
    public List<BudgetResponseDTO> getAllBudgets(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String companyId
    ) {
        return budgetService.getAllBudgets(userId, companyId)
                .stream()
                .map(BudgetMapper::toBudgetResponse)
                .collect(Collectors.toList());
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
        budgetService.closeBudget(userId, budgetId);
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
        BudgetCategoryAllocation allocation =
                budgetService.addCategoryAllocation(
                        userId,
                        budgetId,
                        request.getCategoryName(),
                        request.getAllocatedAmount(),
                        request.getAlertThreshold()
                );

        return BudgetMapper.toAllocationResponse(allocation);
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
        budgetService.removeCategoryAllocation(userId, budgetId, allocationId);
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

        BudgetCategoryAllocation allocation =
                budgetService.updateAllocation(userId, budgetId, allocationId, request);

        return BudgetMapper.toAllocationResponse(allocation);
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

        Budget budget = budgetService.updateBudget(userId, budgetId, request);
        return BudgetMapper.toBudgetResponse(budget);
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
        budgetService.removeBudget(userId, budgetId);
    }

    @GetMapping("/{budgetId}/details")
    public BudgetResponseDTO getAllDetailOfBudget(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId
    ) {
        return budgetService.getAllDetailOfBudget(userId, budgetId);
    }
}