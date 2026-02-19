package com.artha.user.mapper;

import com.artha.user.dto.userCompany.UserCompanyResponse;
import com.artha.user.entity.UserCompany;

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