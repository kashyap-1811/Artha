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
            @RequestBody CreateExpenseRequest request
    ) {
        return expenseService.createExpense(request);
    }

    // ===================== GET BY ID =====================
    @GetMapping("/{id}")
    public ExpenseResponse getExpense(@PathVariable UUID id) {
        return expenseService.getExpense(id);
    }

    // ===================== GET BY COMPANY =====================
    @GetMapping
    public List<ExpenseResponse> getExpenses(
            @RequestParam String companyId
    ) {
        return expenseService.getCompanyExpenses(companyId);
    }

    // ===================== GET BY BUDGET =====================
    @GetMapping("/budget/{budgetId}")
    public List<ExpenseResponse> getExpensesByBudget(
            @PathVariable UUID budgetId
    ) {
        return expenseService.getExpensesByBudgetId(budgetId);
    }

    // ===================== GET BY ALLOCATION =====================
    @GetMapping("/allocation/{allocationId}")
    public List<ExpenseResponse> getExpensesByAllocation(
            @PathVariable UUID allocationId
    ) {
        return expenseService.getExpensesByAllocationId(allocationId);
    }

    // ===================== APPROVE =====================
    @PostMapping("/{id}/approve")
    public ExpenseResponse approveExpense(@PathVariable UUID id) {
        return expenseService.approveExpense(id);
    }

    // ===================== REJECT =====================
    @PostMapping("/{id}/reject")
    public ExpenseResponse rejectExpense(@PathVariable UUID id) {
        return expenseService.rejectExpense(id);
    }

    @GetMapping("/budget/{budgetId}/summary")
    public BudgetExpenseSummaryResponse getBudgetSummary(
            @PathVariable UUID budgetId
    ) {
        return expenseService.getBudgetSummary(budgetId);
    }
}