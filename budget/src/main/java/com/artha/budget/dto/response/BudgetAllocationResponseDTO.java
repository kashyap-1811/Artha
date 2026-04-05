package com.artha.budget.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;
import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetAllocationResponseDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private UUID id;
    private String categoryName;
    private BigDecimal allocatedAmount;
    private Integer alertThreshold;
}