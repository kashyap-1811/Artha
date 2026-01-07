package com.artha.expense.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateExpenseRequest {

    private String companyId;
    private String createdBy;
    private boolean privateCompany;
    private BigDecimal amount;
    private LocalDate spentDate;
    private String type;
    private String reference;
}