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
     * Create a new budget
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BudgetResponseDTO createBudget(
            @RequestBody CreateBudgetRequestDTO request
    ) {

        Budget budget = budgetService.createBudget(
                request.getCompanyId(),
                request.getName(),
                request.getTotalAmount(),
                request.getStartDate(),
                request.getEndDate()
        );

        return BudgetMapper.toBudgetResponse(budget);
    }

    /**
     * Get active budget for a company
     */
    @GetMapping("/active")
    public BudgetResponseDTO getActiveBudget(
            @RequestParam String companyId
    ) {
        Budget budget = budgetService.getActiveBudget(companyId);
        return BudgetMapper.toBudgetResponse(budget);
    }

    /**
     * Get all budgets (history) for a company
     */
    @GetMapping
    public List<BudgetResponseDTO> getAllBudgets(
            @RequestParam String companyId
    ) {
        return budgetService.getAllBudgets(companyId)
                .stream()
                .map(BudgetMapper::toBudgetResponse)
                .collect(Collectors.toList());
    }

    /**
     * Close a budget
     */
    @PostMapping("/{budgetId}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void closeBudget(
            @PathVariable UUID budgetId
    ) {
        budgetService.closeBudget(budgetId);
    }

    /* ===================== Allocations ===================== */

    /**
     * Add category allocation to a budget
     */
    @PostMapping("/{budgetId}/allocations")
    @ResponseStatus(HttpStatus.CREATED)
    public BudgetAllocationResponseDTO addAllocation(
            @PathVariable UUID budgetId,
            @RequestBody AddAllocationRequestDTO request
    ) {

        BudgetCategoryAllocation allocation =
                budgetService.addCategoryAllocation(
                        budgetId,
                        request.getCategoryName(),
                        request.getAllocatedAmount(),
                        request.getAlertThreshold()
                );

        return BudgetMapper.toAllocationResponse(allocation);
    }

    /**
     * Remove category allocation from budget
     */
    @DeleteMapping("/{budgetId}/allocations/{allocationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeAllocation(
            @PathVariable UUID budgetId,
            @PathVariable UUID allocationId
    ) {
        budgetService.removeCategoryAllocation(budgetId, allocationId);
    }


    @PutMapping("/{budgetId}/allocations/{allocationId}")
    public BudgetAllocationResponseDTO updateAllocation(
            @PathVariable UUID budgetId,
            @PathVariable UUID allocationId,
            @RequestBody UpdateAllocationRequestDTO request) {

        BudgetCategoryAllocation allocation =
                budgetService.updateAllocation(budgetId, allocationId, request);

        return BudgetMapper.toAllocationResponse(allocation);
    }

    @PutMapping("/{budgetId}")
    public BudgetResponseDTO updateBudget(
            @PathVariable UUID budgetId,
            @RequestBody UpdateBudgetRequestDTO request) {

        Budget budget = budgetService.updateBudget(budgetId, request);
        return BudgetMapper.toBudgetResponse(budget);
    }

    @DeleteMapping("/{budgetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeBudget(@PathVariable UUID budgetId) {
        budgetService.removeBudget(budgetId);
    }

    @GetMapping("/{budgetId}/details")
    public BudgetResponseDTO getAllDetailOfBudget(@PathVariable UUID budgetId) {
        return budgetService.getAllDetailOfBudget(budgetId);
    }
}