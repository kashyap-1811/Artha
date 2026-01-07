package com.artha.budget.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetAllocationResponseDTO {

    private UUID id;
    private String categoryName;
    private BigDecimal allocatedAmount;
    private Integer alertThreshold;
}