package com.artha.expense.service.impl;

import com.artha.expense.dto.BudgetExpenseSummaryResponse;
import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;
import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;
import com.artha.expense.entity.ExpenseType;
import com.artha.expense.mapper.ExpenseMapper;
import com.artha.expense.repository.ExpenseRepository;
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

    // ===================== CREATE =====================

    @Override
    public ExpenseResponse createExpense(CreateExpenseRequest request) {

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
    public ExpenseResponse getExpense(UUID expenseId) {

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new RuntimeException("Expense not found with id: " + expenseId)
                );

        return ExpenseMapper.toResponse(expense);
    }

    // ===================== GET COMPANY EXPENSES =====================

    @Override
    public List<ExpenseResponse> getCompanyExpenses(String companyId) {

        return expenseRepository.findByCompanyId(companyId)
                .stream()
                .map(ExpenseMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ===================== GET BY BUDGET =====================

    @Override
    public List<ExpenseResponse> getExpensesByBudgetId(UUID budgetId) {

        return expenseRepository.findByBudgetId(budgetId)
                .stream()
                .map(ExpenseMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ===================== GET BY ALLOCATION =====================

    @Override
    public List<ExpenseResponse> getExpensesByAllocationId(UUID allocationId) {

        return expenseRepository.findByAllocationId(allocationId)
                .stream()
                .map(ExpenseMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ===================== APPROVE =====================

    @Override
    public ExpenseResponse approveExpense(UUID expenseId) {

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new RuntimeException("Expense not found with id: " + expenseId)
                );

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
    public ExpenseResponse rejectExpense(UUID expenseId) {

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() ->
                        new RuntimeException("Expense not found with id: " + expenseId)
                );

        if (expense.getStatus() != ExpenseStatus.PENDING) {
            throw new IllegalStateException("Only PENDING expenses can be rejected");
        }

        expense.setStatus(ExpenseStatus.REJECTED);

        return ExpenseMapper.toResponse(
                expenseRepository.save(expense)
        );
    }

    @Override
    public BudgetExpenseSummaryResponse getBudgetSummary(UUID budgetId) {

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