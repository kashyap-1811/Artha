package com.artha.auth.dto.userCompany;

import com.artha.auth.entity.UserCompanyRole;
import lombok.Data;

@Data
public class AddMemberRequest {
    private String userId;
    private UserCompanyRole role;
}