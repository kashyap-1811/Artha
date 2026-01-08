package com.artha.expense.controller;

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

    // Create expense
    @PostMapping
    public ExpenseResponse createExpense(
            @RequestBody CreateExpenseRequest request
    ) {
        return expenseService.createExpense(request);
    }

    // Get all expenses of a company
    @GetMapping
    public List<ExpenseResponse> getExpenses(
            @RequestParam String companyId
    ) {
        return expenseService.getCompanyExpenses(companyId);
    }

    // Approve expense (manager/admin action)
    @PostMapping("/{id}/approve")
    public ExpenseResponse approveExpense(@PathVariable UUID id) {
        return expenseService.approveExpense(id);
    }

    // Reject expense (manager/admin action)
    @PostMapping("/{id}/reject")
    public ExpenseResponse rejectExpense(@PathVariable UUID id) {
        return expenseService.rejectExpense(id);
    }
}