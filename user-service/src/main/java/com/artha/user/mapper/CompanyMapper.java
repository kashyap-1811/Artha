package com.artha.user.mapper;

import com.artha.user.dto.company.CompanyResponse;
import com.artha.user.entity.Company;

public class CompanyMapper {

    public static CompanyResponse toResponse(Company company) {
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                .type(company.getType())
                .build();
    }
}