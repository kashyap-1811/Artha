package com.artha.budget.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "budget_category_allocations",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_budget_category",
                        columnNames = {"budget_id", "category_name"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_allocation_budget",
                        columnList = "budget_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetCategoryAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    /**
     * Many allocations → One budget
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "budget_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_allocation_budget")
    )
    private Budget budget;

    /**
     * Category name is FREE TEXT
     * (frontend may suggest values)
     */
    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    @Column(
            name = "allocated_amount",
            nullable = false,
            precision = 19,
            scale = 2
    )
    private BigDecimal allocatedAmount;

    /**
     * Optional alert threshold (e.g. 80 = 80%)
     */
    @Column(name = "alert_threshold")
    private Integer alertThreshold;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}