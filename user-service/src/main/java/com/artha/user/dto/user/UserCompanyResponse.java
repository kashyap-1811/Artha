package com.artha.user.dto.user;

import com.artha.user.entity.UserCompanyRole;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserCompanyResponse {
    private String companyId;
    private String companyName;
    private UserCompanyRole role;
    private boolean active;
}
