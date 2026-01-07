package com.artha.budget.mapper;

import com.artha.budget.dto.response.BudgetAllocationResponseDTO;
import com.artha.budget.dto.response.BudgetResponseDTO;
import com.artha.budget.entity.Budget;
import com.artha.budget.entity.BudgetCategoryAllocation;

import java.util.List;
import java.util.stream.Collectors;

public class BudgetMapper {

    private BudgetMapper() {
        // utility class
    }

    /* ---------- Budget ---------- */

    public static BudgetResponseDTO toBudgetResponse(Budget budget) {

        return BudgetResponseDTO.builder()
                .id(budget.getId())
                .companyId(budget.getCompanyId())
                .name(budget.getName())
                .totalAmount(budget.getTotalAmount())
                .startDate(budget.getStartDate())
                .endDate(budget.getEndDate())
                .status(budget.getStatus().name())
                .createdAt(budget.getCreatedAt())
                .updatedAt(budget.getUpdatedAt())
                .allocations(
                        budget.getAllocations() == null
                                ? List.of()
                                : budget.getAllocations()
                                .stream()
                                .map(BudgetMapper::toAllocationResponse)
                                .collect(Collectors.toList())
                )
                .build();
    }

    /* ---------- Allocation ---------- */

    public static BudgetAllocationResponseDTO toAllocationResponse(
            BudgetCategoryAllocation allocation
    ) {
        return BudgetAllocationResponseDTO.builder()
                .id(allocation.getId())
                .categoryName(allocation.getCategoryName())
                .allocatedAmount(allocation.getAllocatedAmount())
                .alertThreshold(allocation.getAlertThreshold())
                .build();
    }
}