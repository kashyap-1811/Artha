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
import lombok.extern.slf4j.Slf4j;
import com.artha.budget.dto.event.AllocationEvent;
import com.artha.budget.dto.event.BudgetEvent;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.CacheManager;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class BudgetServiceImpl implements BudgetService {

    private final BudgetRepository budgetRepository;
    private final BudgetCategoryAllocationRepository allocationRepository;
    private final BudgetAuditLogRepository auditLogRepository;
    private final AuthorizationService authorizationService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final CacheManager cacheManager;

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
    @CacheEvict(value = {"company_budgets", "company_budgets_list"}, key = "#companyId")
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

        long dbStart = System.currentTimeMillis();
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
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Create Budget]: " + (dbEnd - dbStart) + "ms ======");

        audit(userId, saved.getId(), BudgetAction.CREATE);

        // Push to Kafka
        kafkaTemplate.send("budget-events", BudgetEvent.builder()
                .id(saved.getId())
                .companyId(saved.getCompanyId())
                .name(saved.getName())
                .totalAmount(saved.getTotalAmount())
                .status(saved.getStatus())
                .action("CREATED")
                .build());

        return saved;
    }

    @Override
    @Cacheable(value = "company_budgets", key = "#companyId")
    public List<BudgetResponseDTO> getActiveBudget(String userId, String companyId) {
        log.info("Cache miss for getActiveBudget, companyId: {}", companyId);
        authorizationService.checkPermission(userId, companyId, Action.VIEW_BUDGET);

        long dbStart = System.currentTimeMillis();
        List<Budget> budgets = budgetRepository.findAllByCompanyIdAndStatus(companyId, BudgetStatus.ACTIVE);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get Active Budget]: " + (dbEnd - dbStart) + "ms ======");

        return budgets.stream()
                .map(BudgetMapper::toBudgetResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(value = "company_budgets_list", key = "#companyId")
    public List<BudgetResponseDTO> getAllBudgets(String userId, String companyId) {
        log.info("Cache miss for getAllBudgets, companyId: {}", companyId);
        authorizationService.checkPermission(userId, companyId, Action.VIEW_BUDGET);

        long dbStart = System.currentTimeMillis();
        List<Budget> budgets = budgetRepository.findAllByCompanyIdOrderByStartDateDesc(companyId);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get All Budgets]: " + (dbEnd - dbStart) + "ms ======");

        return budgets.stream()
                .map(BudgetMapper::toBudgetResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void closeBudget(String userId, UUID budgetId) {
        long dbStart = System.currentTimeMillis();
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.UPDATE_BUDGET);

        if (budget.getStatus() == BudgetStatus.CLOSED) {
            System.out.println("====== DB Execution Time [Close Budget]: " + (System.currentTimeMillis() - dbStart) + "ms ======");
            return;
        }

        budget.setStatus(BudgetStatus.CLOSED);
        budgetRepository.save(budget);
        
        log.info("Evicting cache for companyId: {} due to budget closure", budget.getCompanyId());
        evictCompanyCaches(budget.getCompanyId());

        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Close Budget]: " + (dbEnd - dbStart) + "ms ======");

        audit(userId, budgetId, BudgetAction.CLOSE);

        kafkaTemplate.send("budget-events", BudgetEvent.builder()
                .id(budget.getId())
                .companyId(budget.getCompanyId())
                .name(budget.getName())
                .totalAmount(budget.getTotalAmount())
                .status(budget.getStatus())
                .action("CLOSED")
                .build());
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
        long dbStart = System.currentTimeMillis();
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
        if (currentAllocated == null) currentAllocated = BigDecimal.ZERO;
        
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
        
        log.info("Evicting cache for companyId: {} due to allocation addition", budget.getCompanyId());
        evictCompanyCaches(budget.getCompanyId());

        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Add Category Allocation]: " + (dbEnd - dbStart) + "ms ======");

        audit(userId, budgetId, BudgetAction.ADD_ALLOCATION);

        kafkaTemplate.send("budget-events", AllocationEvent.builder()
                .id(savedAllocation.getId())
                .budgetId(budgetId)
                .categoryName(savedAllocation.getCategoryName())
                .allocatedAmount(savedAllocation.getAllocatedAmount())
                .alertThreshold(savedAllocation.getAlertThreshold())
                .action("CREATED")
                .build());

        return savedAllocation;
    }

    @Override
    public void removeCategoryAllocation(String userId, UUID budgetId, UUID allocationId) {
        long dbStart = System.currentTimeMillis();
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
        
        log.info("Evicting cache for companyId: {} due to allocation removal", budget.getCompanyId());
        evictCompanyCaches(budget.getCompanyId());

        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Remove Category Allocation]: " + (dbEnd - dbStart) + "ms ======");

        audit(userId, budgetId, BudgetAction.REMOVE_ALLOCATION);

        kafkaTemplate.send("budget-events", AllocationEvent.builder()
                .id(allocationId)
                .budgetId(budgetId)
                .action("DELETED")
                .build());
    }

    @Override
    public BudgetCategoryAllocation updateAllocation(
            String userId,
            UUID budgetId,
            UUID allocationId,
            UpdateAllocationRequestDTO request) {

        long dbStart = System.currentTimeMillis();
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
        if (totalOtherAllocations == null) totalOtherAllocations = BigDecimal.ZERO;

        if (totalOtherAllocations.add(request.getAllocatedAmount())
                .compareTo(allocation.getBudget().getTotalAmount()) > 0) {
            throw new RuntimeException("Allocation exceeds total budget");
        }

        allocation.setCategoryName(request.getCategoryName());
        allocation.setAllocatedAmount(request.getAllocatedAmount());
        allocation.setAlertThreshold(request.getAlertThreshold());

        BudgetCategoryAllocation saved = allocationRepository.save(allocation);
        
        log.info("Evicting cache for companyId: {} due to allocation update", allocation.getBudget().getCompanyId());
        evictCompanyCaches(allocation.getBudget().getCompanyId());

        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Update Allocation]: " + (dbEnd - dbStart) + "ms ======");

        audit(userId, budgetId, BudgetAction.UPDATE_ALLOCATION);

        kafkaTemplate.send("budget-events", AllocationEvent.builder()
                .id(saved.getId())
                .budgetId(budgetId)
                .categoryName(saved.getCategoryName())
                .allocatedAmount(saved.getAllocatedAmount())
                .alertThreshold(saved.getAlertThreshold())
                .action("UPDATED")
                .build());

        return saved;
    }

    @Override
    public Budget updateBudget(String userId, UUID budgetId, UpdateBudgetRequestDTO request) {
        long dbStart = System.currentTimeMillis();
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.UPDATE_BUDGET);

        BigDecimal totalAllocated =
                allocationRepository.sumAllocatedAmountByBudgetId(budgetId);
        if (totalAllocated == null) totalAllocated = BigDecimal.ZERO;

        if (request.getTotalAmount().compareTo(totalAllocated) < 0) {
            throw new RuntimeException("Total budget cannot be less than allocated amount");
        }

        budget.setName(request.getName());
        budget.setTotalAmount(request.getTotalAmount());
        budget.setEndDate(request.getEndDate());

        Budget saved = budgetRepository.save(budget);
        
        log.info("Evicting cache for companyId: {} due to budget update", saved.getCompanyId());
        evictCompanyCaches(saved.getCompanyId());
 
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Update Budget]: " + (dbEnd - dbStart) + "ms ======");

        audit(userId, budgetId, BudgetAction.UPDATE);

        kafkaTemplate.send("budget-events", BudgetEvent.builder()
                .id(saved.getId())
                .companyId(saved.getCompanyId())
                .name(saved.getName())
                .totalAmount(saved.getTotalAmount())
                .status(saved.getStatus())
                .action("UPDATED")
                .build());

        return saved;
    }

    @Override
    public void removeBudget(String userId, UUID budgetId) {
        long dbStart = System.currentTimeMillis();
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.DELETE_BUDGET);

        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new IllegalStateException("Cannot delete closed budget");
        }

        budget.setStatus(BudgetStatus.CLOSED);
        budgetRepository.save(budget);
        
        log.info("Evicting cache for companyId: {} due to budget removal", budget.getCompanyId());
        evictCompanyCaches(budget.getCompanyId());

        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Remove Budget]: " + (dbEnd - dbStart) + "ms ======");

        audit(userId, budgetId, BudgetAction.DELETE);

        kafkaTemplate.send("budget-events", BudgetEvent.builder()
                .id(budget.getId())
                .companyId(budget.getCompanyId())
                .action("DELETED")
                .build());
    }

    @Override
    @Cacheable(value = "budget_details", key = "#budgetId")
    public BudgetResponseDTO getAllDetailOfBudget(String userId, UUID budgetId) {
        log.info("Cache miss for getAllDetailOfBudget, budgetId: {}", budgetId);
        long dbStart = System.currentTimeMillis();
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get All Detail Of Budget]: " + (dbEnd - dbStart) + "ms ======");

        authorizationService.checkPermission(userId, budget.getCompanyId(), Action.VIEW_BUDGET);

        return BudgetMapper.toBudgetResponse(budget);
    }

    private void evictCompanyCaches(String companyId) {
        if (cacheManager == null) return;
        
        var budgetsCache = cacheManager.getCache("company_budgets");
        if (budgetsCache != null) budgetsCache.evict(companyId);
        
        var budgetsListCache = cacheManager.getCache("company_budgets_list");
        if (budgetsListCache != null) budgetsListCache.evict(companyId);
        
        var budgetDetailsCache = cacheManager.getCache("budget_details");
        if (budgetDetailsCache != null) budgetDetailsCache.clear(); // Clearing all details for now to be safe
        
        log.info("Finished local cache eviction for companyId: {}", companyId);
    }
}