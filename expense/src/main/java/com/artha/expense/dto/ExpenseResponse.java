package com.artha.expense.dto;

import com.artha.expense.entity.ExpenseStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponse {

    private UUID id;
    private BigDecimal amount;
    private LocalDate spentDate;
    private String type;
    private String reference;
    private ExpenseStatus status;
    private LocalDateTime createdAt;
}