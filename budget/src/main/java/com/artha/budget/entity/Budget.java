package com.artha.budget.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
        name = "budgets",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_budget_company_period",
                        columnNames = {"company_id", "start_date", "end_date"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_budget_company_status",
                        columnList = "company_id, status"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    /**
     * Logical reference to Auth Service Company.id
     * NO foreign key (microservice-safe)
     */
    @Column(name = "company_id", nullable = false, length = 50)
    private String companyId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(
            name = "total_amount",
            nullable = false,
            precision = 19,
            scale = 2
    )
    private BigDecimal totalAmount;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BudgetStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    /**
     * One Budget → Many Category Allocations
     */
    @Builder.Default
    @OneToMany(
            mappedBy = "budget",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private Set<BudgetCategoryAllocation> allocations = new HashSet<>();

    /* ---------- Lifecycle Hooks ---------- */

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.status = BudgetStatus.ACTIVE;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ---------- Relationship Helpers ----------

    public void addAllocation(BudgetCategoryAllocation allocation) {
        allocations.add(allocation);
        allocation.setBudget(this);
    }

    public void removeAllocation(BudgetCategoryAllocation allocation) {
        allocations.remove(allocation);
        allocation.setBudget(null);
    }
}