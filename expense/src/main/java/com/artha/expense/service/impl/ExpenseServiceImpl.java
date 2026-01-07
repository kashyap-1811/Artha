package com.artha.expense.service.impl;

import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;
import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;
import com.artha.expense.mapper.ExpenseMapper;
import com.artha.expense.repository.ExpenseRepository;
import com.artha.expense.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;

    @Override
    public ExpenseResponse createExpense(CreateExpenseRequest request) {

        ExpenseStatus status =
                request.isPrivateCompany()
                        ? ExpenseStatus.APPROVED
                        : ExpenseStatus.PENDING;

        Expense expense = ExpenseMapper.toEntity(request, status);

        return ExpenseMapper.toResponse(
                expenseRepository.save(expense)
        );
    }

    @Override
    public List<ExpenseResponse> getCompanyExpenses(String companyId) {
        return expenseRepository.findByCompanyId(companyId)
                .stream()
                .map(ExpenseMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ExpenseResponse approveExpense(UUID expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        expense.setStatus(ExpenseStatus.APPROVED);
        return ExpenseMapper.toResponse(expenseRepository.save(expense));
    }

    @Override
    public ExpenseResponse rejectExpense(UUID expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        expense.setStatus(ExpenseStatus.REJECTED);
        return ExpenseMapper.toResponse(expenseRepository.save(expense));
    }
}