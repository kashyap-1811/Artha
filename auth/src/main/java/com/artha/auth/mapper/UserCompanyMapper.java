package com.artha.auth.mapper;

import com.artha.auth.dto.userCompany.UserCompanyResponse;
import com.artha.auth.entity.UserCompany;

public class UserCompanyMapper {

    public static UserCompanyResponse toResponse(UserCompany uc) {
        return UserCompanyResponse.builder()
                .companyId(uc.getCompany().getId())
                .companyName(uc.getCompany().getName())
                .companyType(uc.getCompany().getType())
                .role(uc.getRole())
                .build();
    }
}