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
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final AuthorizationService authorizationService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final BudgetServiceClient budgetServiceClient;

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

        ExpenseResponse response = ExpenseMapper.toResponse(saved);

        if (status == ExpenseStatus.APPROVED) {
            String allocationName = budgetServiceClient.getAllocationName(
                userId, saved.getBudgetId(), saved.getAllocationId()
            );
            response.setAllocationName(allocationName);
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
    public List<ExpenseResponse> getCompanyExpenses(String userId, String companyId) {

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

        ExpenseResponse response = ExpenseMapper.toResponse(saved);

        String allocationName = budgetServiceClient.getAllocationName(
            userId, saved.getBudgetId(), saved.getAllocationId()
        );
        response.setAllocationName(allocationName);
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

        return ExpenseMapper.toResponse(saved);
    }

    @Override
    public BudgetExpenseSummaryResponse getBudgetSummary(String userId, UUID budgetId) {

        long dbStart = System.currentTimeMillis();
        List<Expense> sampleExpenses = expenseRepository.findByBudgetId(budgetId);
        if (!sampleExpenses.isEmpty()) {
            authorizationService.checkPermission(userId, sampleExpenses.get(0).getCompanyId(), Action.VIEW_EXPENSE);
        }

        BigDecimal approved = expenseRepository.sumApprovedByBudgetId(budgetId);
        BigDecimal pending = expenseRepository.sumPendingByBudgetId(budgetId);
        BigDecimal rejected = expenseRepository.sumRejectedByBudgetId(budgetId);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get Budget Summary]: " + (dbEnd - dbStart) + "ms ======");

        return new BudgetExpenseSummaryResponse(
                budgetId,
                approved,
                pending,
                rejected
        );
    }

    @Override
    public List<CategoryExpenseDTO> getExpenseChart(String userId, String companyId, int days) {
        authorizationService.checkPermission(userId, companyId, Action.VIEW_EXPENSE);

        java.time.LocalDate endDate = java.time.LocalDate.now();
        java.time.LocalDate startDate = endDate.minusDays(days - 1); // e.g., if days=30, minus 29 so total 30 days inclusive

        List<Expense> expenses = expenseRepository.findByCompanyIdAndSpentDateBetweenAndStatus(
                companyId, startDate, endDate, ExpenseStatus.APPROVED
        );

        java.util.Map<UUID, BigDecimal> grouped = expenses.stream()
                .filter(ex -> ex.getAllocationId() != null)
                .collect(Collectors.groupingBy(
                        Expense::getAllocationId,
                        Collectors.mapping(
                                ex -> ex.getAmount() != null ? ex.getAmount() : BigDecimal.ZERO,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)
                        )
                ));

        return grouped.entrySet().stream()
                .collect(Collectors.toMap(
                        e -> {
                            String catName = "Unknown";
                            try {
                                UUID budgetId = expenses.stream()
                                        .filter(ex -> java.util.Objects.equals(ex.getAllocationId(), e.getKey()))
                                        .findFirst()
                                        .map(Expense::getBudgetId)
                                        .orElse(null);
                                String resolvedName = budgetServiceClient.getAllocationName(userId, budgetId, e.getKey());
                                if (resolvedName != null) {
                                    catName = resolvedName;
                                }
                            } catch (Exception ex) {}
                            return catName;
                        },
                        java.util.Map.Entry::getValue,
                        BigDecimal::add
                ))
                .entrySet().stream()
                .map(e -> new CategoryExpenseDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }
}