package com.artha.user.dto.userCompany;

import com.artha.user.entity.UserCompanyRole;
import lombok.Data;

@Data
public class AddMemberRequest {
    private String userId;
    private UserCompanyRole role;
}