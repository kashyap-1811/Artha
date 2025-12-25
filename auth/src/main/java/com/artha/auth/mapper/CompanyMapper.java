package com.artha.auth.mapper;

import com.artha.auth.dto.company.CompanyResponse;
import com.artha.auth.entity.Company;

public class CompanyMapper {

    public static CompanyResponse toResponse(Company company) {
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                .type(company.getType())
                .build();
    }
}