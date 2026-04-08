package com.artha.budget.dto.event;

import com.artha.budget.entity.BudgetStatus;
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
public class BudgetEvent {
    private UUID id;
    private String companyId;
    private String name;
    private BigDecimal totalAmount;
    private BudgetStatus status;
    private String action; // CREATE, UPDATE, DELETE, CLOSE
    private String eventType;
}
