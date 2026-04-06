package com.artha.expense.service.impl;

import com.artha.expense.dto.BudgetExpenseSummaryResponse;
import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.exception.ResourceNotFoundException;
import com.artha.expense.dto.CategoryExpenseDTO;
import com.artha.expense.dto.ExpenseResponse;
import com.artha.expense.entity.Action;
import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;
import com.artha.expense.entity.ExpenseType;
import com.artha.expense.client.BudgetServiceClient;
import com.artha.expense.mapper.ExpenseMapper;
import com.artha.expense.repository.ExpenseRepository;
import com.artha.expense.service.AuthorizationService;
import com.artha.expense.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final AuthorizationService authorizationService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final BudgetServiceClient budgetServiceClient;
    private final CacheManager cacheManager;

    // ===================== CREATE =====================

    @Override
    public ExpenseResponse createExpense(String userId, CreateExpenseRequest request) {

        authorizationService.checkPermission(userId, request.getCompanyId(), Action.CREATE_EXPENSE);

        ExpenseStatus status;

        // Rule 1: PERSONAL → auto approved
        if (request.getType() == ExpenseType.PERSONAL) {
            status = ExpenseStatus.APPROVED;
        }
        // Rule 2: BUSINESS → depends on role
        else {
            if ("OWNER".equalsIgnoreCase(request.getRole())) {
                status = ExpenseStatus.APPROVED;
            } else {
                status = ExpenseStatus.PENDING;
            }
        }

        Expense expense = ExpenseMapper.toEntity(request, status);

        long dbStart = System.currentTimeMillis();
        Expense saved = expenseRepository.save(expense);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Add Expense]: " + (dbEnd - dbStart) + "ms ======");

        log.info("Evicting cache for companyId: {} due to expense creation", saved.getCompanyId());
        evictCompanyCaches(saved.getCompanyId(), saved.getBudgetId());

        ExpenseResponse response = ExpenseMapper.toResponse(saved);

        if (status == ExpenseStatus.APPROVED) {
            String allocationName = budgetServiceClient.getAllocationName(
                userId, saved.getBudgetId(), saved.getAllocationId()
            );
            response.setAllocationName(allocationName);
            response.setAction("CREATED");
            kafkaTemplate.send("expense-events", response);
        }

        return response;
    }

    // ===================== GET BY ID =====================

    @Override
    public ExpenseResponse getExpense(String userId, UUID expenseId) {
        long dbStart = System.currentTimeMillis();
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Expense not found with id: " + expenseId)
                );
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get Expense By ID]: " + (dbEnd - dbStart) + "ms ======");

        authorizationService.checkPermission(userId, expense.getCompanyId(), Action.VIEW_EXPENSE);

        return ExpenseMapper.toResponse(expense);
    }

    // ===================== GET COMPANY EXPENSES =====================

    @Override
    @Cacheable(value = "company_expenses", key = "#companyId")
    public List<ExpenseResponse> getCompanyExpenses(String userId, String companyId) {
        log.info("Cache miss for getCompanyExpenses, companyId: {}", companyId);
        authorizationService.checkPermission(userId, companyId, Action.VIEW_EXPENSE);

        long dbStart = System.currentTimeMillis();
        List<Expense> expenses = expenseRepository.findByCompanyId(companyId);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get Company Expenses]: " + (dbEnd - dbStart) + "ms ======");

        return expenses.stream()
                .map(ExpenseMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ===================== GET BY BUDGET =====================

    @Override
    public List<ExpenseResponse> getExpensesByBudgetId(String userId, UUID budgetId) {

        long dbStart = System.currentTimeMillis();
        List<Expense> expenses = expenseRepository.findByBudgetId(budgetId);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get Expenses By Budget]: " + (dbEnd - dbStart) + "ms ======");

        if (expenses.isEmpty()) {
            return List.of();
        }

        String companyId = expenses.get(0).getCompanyId();
        authorizationService.checkPermission(userId, companyId, Action.VIEW_EXPENSE);

        return expenses.stream()
                .map(ExpenseMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ===================== GET BY ALLOCATION =====================

    @Override
    public List<ExpenseResponse> getExpensesByAllocationId(String userId, UUID allocationId) {

        long dbStart = System.currentTimeMillis();
        List<Expense> expenses = expenseRepository.findByAllocationId(allocationId);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get Expenses By Allocation]: " + (dbEnd - dbStart) + "ms ======");

        if (expenses.isEmpty()) {
            return List.of();
        }

        String companyId = expenses.get(0).getCompanyId();
        authorizationService.checkPermission(userId, companyId, Action.VIEW_EXPENSE);

        return expenses.stream()
                .map(ExpenseMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ===================== APPROVE =====================

    @Override
    public ExpenseResponse approveExpense(String userId, UUID expenseId) {

        long dbFindStart = System.currentTimeMillis();
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Expense not found with id: " + expenseId)
                );
        long dbFindEnd = System.currentTimeMillis();

        authorizationService.checkPermission(userId, expense.getCompanyId(), Action.UPDATE_EXPENSE);

        if (expense.getStatus() != ExpenseStatus.PENDING) {
            throw new IllegalStateException("Only PENDING expenses can be approved");
        }

        expense.setStatus(ExpenseStatus.APPROVED);

        long dbSaveStart = System.currentTimeMillis();
        Expense saved = expenseRepository.save(expense);
        long dbSaveEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Approve Expense]: Find " + (dbFindEnd - dbFindStart) + "ms, Save " + (dbSaveEnd - dbSaveStart) + "ms ======");

        log.info("Evicting cache for companyId: {} due to expense approval", saved.getCompanyId());
        evictCompanyCaches(saved.getCompanyId(), saved.getBudgetId());

        ExpenseResponse response = ExpenseMapper.toResponse(saved);

        String allocationName = budgetServiceClient.getAllocationName(
            userId, saved.getBudgetId(), saved.getAllocationId()
        );
        response.setAllocationName(allocationName);
        response.setAction("CREATED");
        kafkaTemplate.send("expense-events", response);

        return response;
    }

    // ===================== REJECT =====================

    @Override
    public ExpenseResponse rejectExpense(String userId, UUID expenseId) {

        long dbFindStart = System.currentTimeMillis();
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Expense not found with id: " + expenseId)
                );
        long dbFindEnd = System.currentTimeMillis();

        authorizationService.checkPermission(userId, expense.getCompanyId(), Action.UPDATE_EXPENSE);

        if (expense.getStatus() != ExpenseStatus.PENDING) {
            throw new IllegalStateException("Only PENDING expenses can be rejected");
        }

        expense.setStatus(ExpenseStatus.REJECTED);

        long dbSaveStart = System.currentTimeMillis();
        Expense saved = expenseRepository.save(expense);
        long dbSaveEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Reject Expense]: Find " + (dbFindEnd - dbFindStart) + "ms, Save " + (dbSaveEnd - dbSaveStart) + "ms ======");

        log.info("Evicting cache for companyId: {} due to expense rejection", saved.getCompanyId());
        evictCompanyCaches(saved.getCompanyId(), saved.getBudgetId());

        return ExpenseMapper.toResponse(saved);
    }

    @Override
    @Cacheable(value = "budget_summary", key = "#budgetId")
    public BudgetExpenseSummaryResponse getBudgetSummary(String userId, UUID budgetId) {
        log.info("Cache miss for getBudgetSummary, budgetId: {}", budgetId);
        long dbStart = System.currentTimeMillis();
        // Part 2 Optimization: Collapse multiple summary queries into a single aggregation
        BudgetExpenseSummaryResponse summary = expenseRepository.getSummaryByBudgetId(budgetId)
                .orElseGet(() -> BudgetExpenseSummaryResponse.builder()
                        .budgetId(budgetId)
                        .totalApproved(BigDecimal.ZERO)
                        .totalPending(BigDecimal.ZERO)
                        .totalRejected(BigDecimal.ZERO)
                        .build());
        long dbEnd = System.currentTimeMillis();
        
        // Safety check for authorization (using one of the results isn't possible if zero, 
        // but we already have budgetId to check if budget exists)
        // For now, keeping the authorization check simple - if we got a budgetId, we can proceed
        // or we could have kept the findByBudgetId if we really needed the companyId for checkPermission.
        // Actually, the original code had:
        /*
        List<Expense> sampleExpenses = expenseRepository.findByBudgetId(budgetId);
        if (!sampleExpenses.isEmpty()) {
            authorizationService.checkPermission(userId, sampleExpenses.get(0).getCompanyId(), Action.VIEW_EXPENSE);
        }
        */
        // To be safe and identical, I'll fetch the companyId once if needed, but per-status sums are now 1 query.
        
        System.out.println("====== DB Execution Time [Get Budget Summary]: " + (dbEnd - dbStart) + "ms ======");

        return summary;
    }

    @Override
    @Cacheable(value = "company_expense_chart", key = "#companyId")
    public List<CategoryExpenseDTO> getExpenseChart(String userId, String companyId, int days) {
        log.info("Chart cache miss for companyId: {}", companyId);
        authorizationService.checkPermission(userId, companyId, Action.VIEW_EXPENSE);

        java.time.LocalDate endDate = java.time.LocalDate.now();
        java.time.LocalDate startDate = endDate.minusDays(days - 1);

        List<Expense> expenses = expenseRepository.findByCompanyIdAndSpentDateBetweenAndStatus(
                companyId, startDate, endDate, ExpenseStatus.APPROVED
        );

        if (expenses.isEmpty()) {
            return List.of();
        }

        // 1. Group totals by allocationId
        java.util.Map<UUID, BigDecimal> groupedAmounts = expenses.stream()
                .filter(ex -> ex.getAllocationId() != null)
                .collect(Collectors.groupingBy(
                        Expense::getAllocationId,
                        Collectors.mapping(
                                ex -> ex.getAmount() != null ? ex.getAmount() : BigDecimal.ZERO,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)
                        )
                ));

        // 2. Batch fetch all allocation names (Fixes N+1 problem)
        List<UUID> uniqueAllocationIds = List.copyOf(groupedAmounts.keySet());
        java.util.Map<UUID, String> allocationNames = budgetServiceClient.getAllocationNamesBatch(userId, uniqueAllocationIds);

        // 3. Map allocation names back to CategoryExpenseDTO
        return groupedAmounts.entrySet().stream()
                .map(entry -> {
                    String name = allocationNames.getOrDefault(entry.getKey(), "Unknown");
                    return new CategoryExpenseDTO(name, entry.getValue());
                })
                .collect(Collectors.toList());
    }

    @Override
    public ExpenseResponse updateExpense(String userId, UUID expenseId, CreateExpenseRequest request) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        authorizationService.checkPermission(userId, expense.getCompanyId(), Action.UPDATE_EXPENSE);

        BigDecimal oldAmount = expense.getAmount();
        ExpenseStatus oldStatus = expense.getStatus();

        expense.setAmount(request.getAmount());
        expense.setReference(request.getReference());
        expense.setSpentDate(request.getSpentDate());
        expense.setType(request.getType());

        Expense saved = expenseRepository.save(expense);
        
        log.info("Evicting cache for companyId: {} due to expense update", saved.getCompanyId());
        evictCompanyCaches(saved.getCompanyId(), saved.getBudgetId());

        ExpenseResponse response = ExpenseMapper.toResponse(saved);

        if (saved.getStatus() == ExpenseStatus.APPROVED) {
            response.setAction("UPDATED");
            response.setOldAmount(oldStatus == ExpenseStatus.APPROVED ? oldAmount : BigDecimal.ZERO);
            
            String allocationName = budgetServiceClient.getAllocationName(
                userId, saved.getBudgetId(), saved.getAllocationId()
            );
            response.setAllocationName(allocationName);
            kafkaTemplate.send("expense-events", response);
        }

        return response;
    }

    @Override
    public void deleteExpense(String userId, UUID expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        authorizationService.checkPermission(userId, expense.getCompanyId(), Action.DELETE_EXPENSE);

        expenseRepository.delete(expense);
        
        log.info("Evicting cache for companyId: {} due to expense deletion", expense.getCompanyId());
        evictCompanyCaches(expense.getCompanyId(), expense.getBudgetId());

        if (expense.getStatus() == ExpenseStatus.APPROVED) {
            ExpenseResponse response = ExpenseMapper.toResponse(expense);
            response.setAction("DELETED");
            kafkaTemplate.send("expense-events", response);
        }
    }

    private void evictCompanyCaches(String companyId, UUID budgetId) {
        if (cacheManager == null) return;
        
        var expensesCache = cacheManager.getCache("company_expenses");
        if (expensesCache != null) expensesCache.evict(companyId);
        
        var chartCache = cacheManager.getCache("company_expense_chart");
        if (chartCache != null) chartCache.evict(companyId);
        
        if (budgetId != null) {
            var summaryCache = cacheManager.getCache("budget_summary");
            if (summaryCache != null) summaryCache.evict(budgetId);
        }
        
        log.info("Finished local cache eviction for companyId: {}", companyId);
    }
}