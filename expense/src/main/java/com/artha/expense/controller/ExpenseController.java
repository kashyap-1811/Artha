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
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.createExpense(userId, request);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Add Expense]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    // ===================== GET BY ID =====================
    @GetMapping("/{id}")
    public ExpenseResponse getExpense(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id) {
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.getExpense(userId, id);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Expense By ID]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    // ===================== GET BY COMPANY =====================
    @GetMapping
    public List<ExpenseResponse> getExpenses(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String companyId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.getCompanyExpenses(userId, companyId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Company Expenses]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    // ===================== GET BY BUDGET =====================
    @GetMapping("/budget/{budgetId}")
    public List<ExpenseResponse> getExpensesByBudget(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.getExpensesByBudgetId(userId, budgetId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Expenses By Budget]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    // ===================== GET BY ALLOCATION =====================
    @GetMapping("/allocation/{allocationId}")
    public List<ExpenseResponse> getExpensesByAllocation(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID allocationId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.getExpensesByAllocationId(userId, allocationId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Expenses By Allocation]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    // ===================== APPROVE =====================
    @PostMapping("/{id}/approve")
    public ExpenseResponse approveExpense(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id) {
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.approveExpense(userId, id);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Approve Expense]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    // ===================== REJECT =====================
    @PostMapping("/{id}/reject")
    public ExpenseResponse rejectExpense(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id) {
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.rejectExpense(userId, id);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Reject Expense]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    @GetMapping("/budget/{budgetId}/summary")
    public BudgetExpenseSummaryResponse getBudgetSummary(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID budgetId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.getBudgetSummary(userId, budgetId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Budget Summary]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    // ===================== CHART =====================
    @GetMapping("/chart")
    public List<com.artha.expense.dto.CategoryExpenseDTO> getExpenseChart(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String companyId,
            @RequestParam(defaultValue = "30") int days
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return expenseService.getExpenseChart(userId, companyId, days);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Expense Chart]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    @PutMapping("/{id}")
    public ExpenseResponse updateExpense(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @RequestBody CreateExpenseRequest request
    ) {
        return expenseService.updateExpense(userId, id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteExpense(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        expenseService.deleteExpense(userId, id);
    }
}