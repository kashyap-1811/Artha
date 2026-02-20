package com.artha.budget.service.impl;

import com.artha.budget.dto.request.UpdateAllocationRequestDTO;
import com.artha.budget.dto.request.UpdateBudgetRequestDTO;
import com.artha.budget.exception.ResourceNotFoundException;
import com.artha.budget.dto.response.BudgetResponseDTO;
import com.artha.budget.entity.*;
import com.artha.budget.mapper.BudgetMapper;
import com.artha.budget.repository.BudgetAuditLogRepository;
import com.artha.budget.repository.BudgetCategoryAllocationRepository;
import com.artha.budget.repository.BudgetRepository;
import com.artha.budget.service.AuthorizationService;
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
    private final BudgetAuditLogRepository auditLogRepository;
    private final AuthorizationService authorizationService;

    /* ===================== Audit Helper ===================== */

    private void audit(String userId, UUID budgetId, BudgetAction action) {
        BudgetAuditLog log = new BudgetAuditLog();
        log.setBudgetId(budgetId);
        log.setUserId(userId);
        log.setAction(action);
        auditLogRepository.save(log);
    }

    /* ===================== Budget ===================== */

    @Override
    public Budget createBudget(
            String userId,
            String companyId,
            String name,
            BigDecimal totalAmount,
            LocalDate startDate,
            LocalDate endDate
    ) {
        authorizationService.checkPermission(userId, companyId, Action.CREATE_BUDGET);

        // Validations
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }

        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Total amount must be greater than zero");
        }

        // Overlap check
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
                .createdBy(userId)
                .name(name)
                .totalAmount(totalAmount)
                .startDate(startDate)
                .endDate(endDate)
                .status(BudgetStatus.ACTIVE)
                .build();

        Budget saved = budgetRepository.save(budget);

        audit(userId, saved.getId(), BudgetAction.CREATE);
        return saved;
    }

    @Override
    public Budget getActiveBudget(String userId, String companyId) {
        authorizationService.checkPermission(userId, companyId, Action.VIEW_BUDGET);

        return budgetRepository
                .findByCompanyIdAndStatus(companyId, BudgetStatus.ACTIVE)
                .orElseThrow(() ->
                        new IllegalStateException("No active budget found for company")
                );
    }

    @Override
    public List<Budget> getAllBudgets(String userId, String companyId) {
        authorizationService.checkPermission(userId, companyId, Action.VIEW_BUDGET);
        return budgetRepository.findAllByCompanyIdOrderByStartDateDesc(companyId);
    }

    @Override
    public void closeBudget(String userId, UUID budgetId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.UPDATE_BUDGET);

        if (budget.getStatus() == BudgetStatus.CLOSED) {
            return;
        }

        budget.setStatus(BudgetStatus.CLOSED);
        budgetRepository.save(budget);

        audit(userId, budgetId, BudgetAction.CLOSE);
    }

    /* ===================== Allocations ===================== */

    @Override
    public BudgetCategoryAllocation addCategoryAllocation(
            String userId,
            UUID budgetId,
            String categoryName,
            BigDecimal allocatedAmount,
            Integer alertThreshold
    ) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.UPDATE_BUDGET);

        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new IllegalStateException("Cannot modify a closed budget");
        }

        if (allocatedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Allocated amount must be greater than zero");
        }

        if (allocationRepository.existsByBudgetIdAndCategoryName(budgetId, categoryName)) {
            throw new IllegalStateException("Category already exists in this budget");
        }

        BigDecimal currentAllocated = allocationRepository.sumAllocatedAmountByBudgetId(budgetId);
        BigDecimal newTotal = currentAllocated.add(allocatedAmount);

        if (newTotal.compareTo(budget.getTotalAmount()) > 0) {
            throw new IllegalStateException("Total allocated amount exceeds budget limit");
        }

        BudgetCategoryAllocation allocation = BudgetCategoryAllocation.builder()
                .categoryName(categoryName)
                .allocatedAmount(allocatedAmount)
                .alertThreshold(alertThreshold)
                .build();

        // Set the parent reference natively instead of cascading the whole budget
        allocation.setBudget(budget);
        BudgetCategoryAllocation savedAllocation = allocationRepository.save(allocation);

        audit(userId, budgetId, BudgetAction.ADD_ALLOCATION);
        return savedAllocation;
    }

    @Override
    public void removeCategoryAllocation(String userId, UUID budgetId, UUID allocationId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.UPDATE_BUDGET);

        BudgetCategoryAllocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found"));

        if (!allocation.getBudget().getId().equals(budget.getId())) {
            throw new IllegalArgumentException("Allocation does not belong to this budget");
        }

        budget.removeAllocation(allocation);
        budgetRepository.save(budget);

        audit(userId, budgetId, BudgetAction.REMOVE_ALLOCATION);
    }

    @Override
    public BudgetCategoryAllocation updateAllocation(
            String userId,
            UUID budgetId,
            UUID allocationId,
            UpdateAllocationRequestDTO request) {

        BudgetCategoryAllocation allocation =
                allocationRepository.findById(allocationId)
                        .orElseThrow(() -> new ResourceNotFoundException("Allocation not found"));

        if (!allocation.getBudget().getId().equals(budgetId)) {
            throw new RuntimeException("Invalid budget allocation mapping");
        }

        authorizationService.checkPermission(userId, allocation.getBudget().getCompanyId(), Action.UPDATE_BUDGET);

        if (request.getAllocatedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Allocated amount must be greater than zero");
        }

        BigDecimal totalOtherAllocations =
                allocationRepository.sumAllocatedAmountByBudgetExcludingId(budgetId, allocationId);

        if (totalOtherAllocations.add(request.getAllocatedAmount())
                .compareTo(allocation.getBudget().getTotalAmount()) > 0) {
            throw new RuntimeException("Allocation exceeds total budget");
        }

        allocation.setCategoryName(request.getCategoryName());
        allocation.setAllocatedAmount(request.getAllocatedAmount());
        allocation.setAlertThreshold(request.getAlertThreshold());

        BudgetCategoryAllocation saved = allocationRepository.save(allocation);

        audit(userId, budgetId, BudgetAction.UPDATE_ALLOCATION);
        return saved;
    }

    @Override
    public Budget updateBudget(String userId, UUID budgetId, UpdateBudgetRequestDTO request) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.UPDATE_BUDGET);

        BigDecimal totalAllocated =
                allocationRepository.sumAllocatedAmountByBudgetId(budgetId);

        if (request.getTotalAmount().compareTo(totalAllocated) < 0) {
            throw new RuntimeException("Total budget cannot be less than allocated amount");
        }

        budget.setName(request.getName());
        budget.setTotalAmount(request.getTotalAmount());
        budget.setEndDate(request.getEndDate());

        Budget saved = budgetRepository.save(budget);

        audit(userId, budgetId, BudgetAction.UPDATE);
        return saved;
    }

    @Override
    public void removeBudget(String userId, UUID budgetId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.DELETE_BUDGET);

        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new IllegalStateException("Cannot delete closed budget");
        }

        budget.setStatus(BudgetStatus.CLOSED);
        budgetRepository.save(budget);

        audit(userId, budgetId, BudgetAction.DELETE);
    }

    @Override
    public BudgetResponseDTO getAllDetailOfBudget(String userId, UUID budgetId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.VIEW_BUDGET);

        return BudgetMapper.toBudgetResponse(budget);
    }
}