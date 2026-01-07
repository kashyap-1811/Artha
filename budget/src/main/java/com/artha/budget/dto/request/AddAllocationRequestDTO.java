package com.artha.budget.dto.request;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddAllocationRequestDTO {

    private String categoryName;
    private BigDecimal allocatedAmount;
    private Integer alertThreshold;
}