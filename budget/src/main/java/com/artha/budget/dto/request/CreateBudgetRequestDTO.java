package com.artha.budget.dto.request;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBudgetRequestDTO {

    private String companyId;
    private String name;
    private BigDecimal totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
}