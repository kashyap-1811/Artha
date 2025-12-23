package com.artha.auth.dto.userCompany;

import com.artha.auth.entity.CompanyType;
import com.artha.auth.entity.UserCompanyRole;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserCompanyResponse {
    private String companyId;
    private String companyName;
    private CompanyType companyType;
    private UserCompanyRole role;
}