package com.artha.user.dto;

import com.artha.user.entity.UserCompanyRole;
import lombok.Data;

@Data
public class MemberRequest {
    private String userId;
    private UserCompanyRole role;
}
