package com.artha.user.dto.userCompany;

import com.artha.user.entity.CompanyType;
import com.artha.user.entity.UserCompanyRole;
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