package com.artha.user.dto.userCompany;

import com.artha.user.entity.UserCompanyRole;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CompanyMemberResponse {
    private String userId;
    private String fullName;
    private String email;
    private UserCompanyRole role;
    private boolean active;
}