package com.artha.budget.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllocationEvent {
    private UUID id;
    private UUID budgetId;
    private String categoryName;
    private BigDecimal allocatedAmount;
    private Integer alertThreshold;
    private String action; // CREATE, UPDATE, DELETE
}
