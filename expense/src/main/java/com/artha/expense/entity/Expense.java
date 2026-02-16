package com.artha.expense.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "expenses",
        indexes = {
                @Index(name = "idx_expense_budget", columnList = "budget_id"),
                @Index(name = "idx_expense_allocation", columnList = "allocation_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private String companyId;

    @Column(name = "budget_id", nullable = false)
    private UUID budgetId;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    private String reference;

    private LocalDate spentDate;

    @Enumerated(EnumType.STRING)
    private ExpenseType type; // PERSONAL / BUSINESS

    @Enumerated(EnumType.STRING)
    private ExpenseStatus status; // PENDING / APPROVED / REJECTED

    private Boolean warning;

    private String createdBy;

    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}