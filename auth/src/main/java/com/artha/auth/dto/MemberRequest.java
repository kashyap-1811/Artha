package com.artha.auth.dto;

import com.artha.auth.entity.CompanyRole;
import lombok.Data;

@Data
public class MemberRequest {
    private String userId;
    private CompanyRole role;
}
