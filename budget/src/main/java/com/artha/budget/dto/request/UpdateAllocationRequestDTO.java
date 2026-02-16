package com.artha.budget.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateAllocationRequestDTO {
    private String categoryName;
    private BigDecimal allocatedAmount;
    private Integer alertThreshold;
}