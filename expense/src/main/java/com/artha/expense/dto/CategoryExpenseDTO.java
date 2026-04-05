package com.artha.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryExpenseDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private String categoryName;
    private BigDecimal totalAmount;
}
