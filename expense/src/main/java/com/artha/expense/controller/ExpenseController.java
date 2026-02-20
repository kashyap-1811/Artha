package com.artha.expense.controller;

import com.artha.expense.dto.BudgetExpenseSummaryResponse;
import com.artha.expense.dto.CreateExpenseRequest;
import com.artha.expense.dto.ExpenseResponse;
import com.artha.expense.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    // ===================== CREATE =====================
    @PostMapping
    public ExpenseResponse createExpense(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody CreateExpenseRequest request
    ) {
        return expenseService.createExpense(userId, request);
    }

    // ===================== GET BY ID =====================
    @GetMapping("/{id}")
    public ExpenseResponse getExpense(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id) {
        return expenseService.getExpense(userId, id);
    }

    // ===================== GET BY COMPANY =====================
    @GetMapping
    public List<ExpenseResponse> getExpenses(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String companyId
    ) {
        return expenseService.getCompanyExpenses(userId, companyId);
    }

    // ===================== GET BY BUDGET =====================
    @GetMapping("/budget/{budgetId}")
    public List<ExpenseResponse> getExpensesByBudget(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId
    ) {
        return expenseService.getExpensesByBudgetId(userId, budgetId);
    }

    // ===================== GET BY ALLOCATION =====================
    @GetMapping("/allocation/{allocationId}")
    public List<ExpenseResponse> getExpensesByAllocation(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID allocationId
    ) {
        return expenseService.getExpensesByAllocationId(userId, allocationId);
    }

    // ===================== APPROVE =====================
    @PostMapping("/{id}/approve")
    public ExpenseResponse approveExpense(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id) {
        return expenseService.approveExpense(userId, id);
    }

    // ===================== REJECT =====================
    @PostMapping("/{id}/reject")
    public ExpenseResponse rejectExpense(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id) {
        return expenseService.rejectExpense(userId, id);
    }

    @GetMapping("/budget/{budgetId}/summary")
    public BudgetExpenseSummaryResponse getBudgetSummary(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId
    ) {
        return expenseService.getBudgetSummary(userId, budgetId);
    }
}