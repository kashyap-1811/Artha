package com.artha.expense.repository;

import com.artha.expense.entity.Expense;
import com.artha.expense.entity.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    List<Expense> findByCompanyId(String companyId);

    List<Expense> findByCompanyIdAndStatus(
            String companyId,
            ExpenseStatus status
    );

    List<Expense> findByCompanyIdAndSpentDateBetweenAndStatus(
            String companyId,
            LocalDate startDate,
            LocalDate endDate,
            ExpenseStatus status
    );
}