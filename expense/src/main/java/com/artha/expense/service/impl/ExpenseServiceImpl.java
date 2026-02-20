package com.artha.expense.service.impl;

import com.artha.expense.dto.BudgetExpenseSummaryResponse;
import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.exception.ResourceNotFoundException;
import com.artha.expense.dto.ExpenseResponse;
import com.artha.expense.entity.Action;
import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;
import com.artha.expense.entity.ExpenseType;
import com.artha.expense.mapper.ExpenseMapper;
import com.artha.expense.repository.ExpenseRepository;
import com.artha.expense.service.AuthorizationService;
import com.artha.expense.service.ExpenseService;
import lombok.RequiredArgsConstructor;
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

        Expense saved = expenseRepository.save(expense);

        return ExpenseMapper.toResponse(saved);
    }

    // ===================== GET BY ID =====================

    @Override
    public ExpenseResponse getExpense(String userId, UUID expenseId) {

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Expense not found with id: " + expenseId)
                );

        authorizationService.checkPermission(userId, expense.getCompanyId(), Action.VIEW_EXPENSE);

        return ExpenseMapper.toResponse(expense);
    }

    // ===================== GET COMPANY EXPENSES =====================

    @Override
    public List<ExpenseResponse> getCompanyExpenses(String userId, String companyId) {

        authorizationService.checkPermission(userId, companyId, Action.VIEW_EXPENSE);

        return expenseRepository.findByCompanyId(companyId)
                .stream()
                .map(ExpenseMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ===================== GET BY BUDGET =====================

    @Override
    public List<ExpenseResponse> getExpensesByBudgetId(String userId, UUID budgetId) {

        // Need the companyId to check permissions.
        // We fetch the list first. Wait, if list is empty we can't get companyId?
        // Let's get the list first. If empty, return empty list (doesn't matter).
        // If not empty, check permission on the companyId of the first item.
        List<Expense> expenses = expenseRepository.findByBudgetId(budgetId);
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

        List<Expense> expenses = expenseRepository.findByAllocationId(allocationId);
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

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Expense not found with id: " + expenseId)
                );

        authorizationService.checkPermission(userId, expense.getCompanyId(), Action.UPDATE_EXPENSE);

        if (expense.getStatus() != ExpenseStatus.PENDING) {
            throw new IllegalStateException("Only PENDING expenses can be approved");
        }

        expense.setStatus(ExpenseStatus.APPROVED);

        return ExpenseMapper.toResponse(
                expenseRepository.save(expense)
        );
    }

    // ===================== REJECT =====================

    @Override
    public ExpenseResponse rejectExpense(String userId, UUID expenseId) {

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Expense not found with id: " + expenseId)
                );

        authorizationService.checkPermission(userId, expense.getCompanyId(), Action.UPDATE_EXPENSE);

        if (expense.getStatus() != ExpenseStatus.PENDING) {
            throw new IllegalStateException("Only PENDING expenses can be rejected");
        }

        expense.setStatus(ExpenseStatus.REJECTED);

        return ExpenseMapper.toResponse(
                expenseRepository.save(expense)
        );
    }

    @Override
    public BudgetExpenseSummaryResponse getBudgetSummary(String userId, UUID budgetId) {

        // Note: Ideally we'd look up the budget's companyId first, but we don't have a direct Budget client here.
        // We will attempt to get expenses by budgetId.
        List<Expense> sampleExpenses = expenseRepository.findByBudgetId(budgetId);
        if (!sampleExpenses.isEmpty()) {
            authorizationService.checkPermission(userId, sampleExpenses.get(0).getCompanyId(), Action.VIEW_EXPENSE);
        } else {
            // Cannot reliably determine companyId from empty expenses. If budget is completely empty of expenses, returning 0 summary is safe.
        }

        BigDecimal approved = expenseRepository.sumApprovedByBudgetId(budgetId);
        BigDecimal pending = expenseRepository.sumPendingByBudgetId(budgetId);
        BigDecimal rejected = expenseRepository.sumRejectedByBudgetId(budgetId);

        return new BudgetExpenseSummaryResponse(
                budgetId,
                approved,
                pending,
                rejected
        );
    }
}