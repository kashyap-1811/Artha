package com.artha.budget.service.impl;

import com.artha.budget.dto.request.UpdateAllocationRequestDTO;
import com.artha.budget.dto.request.UpdateBudgetRequestDTO;
import com.artha.budget.dto.response.BudgetResponseDTO;
import com.artha.budget.entity.Budget;
import com.artha.budget.entity.BudgetCategoryAllocation;
import com.artha.budget.entity.BudgetStatus;
import com.artha.budget.mapper.BudgetMapper;
import com.artha.budget.repository.BudgetCategoryAllocationRepository;
import com.artha.budget.repository.BudgetRepository;
import com.artha.budget.service.BudgetService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class BudgetServiceImpl implements BudgetService {

    private final BudgetRepository budgetRepository;
    private final BudgetCategoryAllocationRepository allocationRepository;

    /* ===================== Budget ===================== */

    @Override
    public Budget createBudget(
            String companyId,
            String name,
            BigDecimal totalAmount,
            LocalDate startDate,
            LocalDate endDate
    ) {

        // ---- validations ----
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }

        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Total amount must be greater than zero");
        }

        // ---- overlap check ----
        boolean overlapping = budgetRepository
                .existsByCompanyIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        companyId,
                        BudgetStatus.ACTIVE,
                        endDate,
                        startDate
                );

        if (overlapping) {
            throw new IllegalStateException("Overlapping active budget already exists");
        }

        Budget budget = Budget.builder()
                .companyId(companyId)
                .name(name)
                .totalAmount(totalAmount)
                .startDate(startDate)
                .endDate(endDate)
                .status(BudgetStatus.ACTIVE)
                .build();

        return budgetRepository.save(budget);
    }

    @Override
    public Budget getActiveBudget(String companyId) {
        return budgetRepository
                .findByCompanyIdAndStatus(companyId, BudgetStatus.ACTIVE)
                .orElseThrow(() ->
                        new IllegalStateException("No active budget found for company")
                );
    }

    @Override
    public List<Budget> getAllBudgets(String companyId) {
        return budgetRepository.findAllByCompanyIdOrderByStartDateDesc(companyId);
    }

    @Override
    public void closeBudget(UUID budgetId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));

        if (budget.getStatus() == BudgetStatus.CLOSED) {
            return;
        }

        budget.setStatus(BudgetStatus.CLOSED);
        budgetRepository.save(budget);
    }

    /* ===================== Allocations ===================== */

    @Override
    public BudgetCategoryAllocation addCategoryAllocation(
            UUID budgetId,
            String categoryName,
            BigDecimal allocatedAmount,
            Integer alertThreshold
    ) {

        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));

        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new IllegalStateException("Cannot modify a closed budget");
        }

        if (allocatedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Allocated amount must be greater than zero");
        }

        // ---- duplicate category check ----
        if (allocationRepository.existsByBudgetIdAndCategoryName(budgetId, categoryName)) {
            throw new IllegalStateException("Category already exists in this budget");
        }

        // ---- allocation sum validation ----
        BigDecimal currentAllocated =
                allocationRepository.sumAllocatedAmountByBudgetId(budgetId);

        BigDecimal newTotal = currentAllocated.add(allocatedAmount);

        if (newTotal.compareTo(budget.getTotalAmount()) > 0) {
            throw new IllegalStateException("Total allocated amount exceeds budget limit");
        }

        BudgetCategoryAllocation allocation = BudgetCategoryAllocation.builder()
                .categoryName(categoryName)
                .allocatedAmount(allocatedAmount)
                .alertThreshold(alertThreshold)
                .build();

        // IMPORTANT: maintain both sides
        budget.addAllocation(allocation);

        budgetRepository.save(budget);

        return allocation;
    }

    @Override
    public void removeCategoryAllocation(UUID budgetId, UUID allocationId) {

        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));

        BudgetCategoryAllocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> new IllegalArgumentException("Allocation not found"));

        if (!allocation.getBudget().getId().equals(budget.getId())) {
            throw new IllegalArgumentException("Allocation does not belong to this budget");
        }

        budget.removeAllocation(allocation);

        budgetRepository.save(budget);
    }

    @Override
    public BudgetCategoryAllocation updateAllocation(
            UUID budgetId,
            UUID allocationId,
            UpdateAllocationRequestDTO request) {

        BudgetCategoryAllocation allocation =
                allocationRepository.findById(allocationId)
                        .orElseThrow(() -> new RuntimeException("Allocation not found"));

        if (!allocation.getBudget().getId().equals(budgetId)) {
            throw new RuntimeException("Invalid budget allocation mapping");
        }

        if (request.getAllocatedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Allocated amount must be greater than zero");
        }

        // Validate sum of allocations <= total budget
        BigDecimal totalOtherAllocations =
                allocationRepository.sumAllocatedAmountByBudgetExcludingId(budgetId, allocationId);

        if (totalOtherAllocations.add(request.getAllocatedAmount())
                .compareTo(allocation.getBudget().getTotalAmount()) > 0) {
            throw new RuntimeException("Allocation exceeds total budget");
        }

        allocation.setCategoryName(request.getCategoryName());
        allocation.setAllocatedAmount(request.getAllocatedAmount());
        allocation.setAlertThreshold(request.getAlertThreshold());

        return allocationRepository.save(allocation);
    }

    @Override
    public Budget updateBudget(UUID budgetId, UpdateBudgetRequestDTO request) {

        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new RuntimeException("Budget not found"));

        BigDecimal totalAllocated =
                allocationRepository.sumAllocatedAmountByBudgetId(budgetId);

        if (request.getTotalAmount().compareTo(totalAllocated) < 0) {
            throw new RuntimeException("Total budget cannot be less than allocated amount");
        }

        budget.setName(request.getName());
        budget.setTotalAmount(request.getTotalAmount());
        budget.setEndDate(request.getEndDate());

        return budgetRepository.save(budget);
    }

    @Override
    public void removeBudget(UUID budgetId) {

        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));

        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new IllegalStateException("Cannot delete closed budget");
        }

        budget.setStatus(BudgetStatus.CLOSED);

        budgetRepository.save(budget);
    }

    @Override
    public BudgetResponseDTO getAllDetailOfBudget(UUID budgetId) {

        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));

        return BudgetMapper.toBudgetResponse(budget);
    }
}