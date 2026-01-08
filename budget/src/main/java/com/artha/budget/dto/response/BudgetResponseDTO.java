package com.artha.budget.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetResponseDTO {

    private UUID id;
    private String companyId;
    private String name;
    private BigDecimal totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;

    private List<BudgetAllocationResponseDTO> allocations;
}