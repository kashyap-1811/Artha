package com.artha.auth.dto;

import com.artha.auth.entity.UserCompanyRole;
import lombok.Data;

@Data
public class MemberRequest {
    private String userId;
    private UserCompanyRole role;
}
