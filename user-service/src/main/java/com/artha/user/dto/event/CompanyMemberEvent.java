package com.artha.user.dto.event;

import com.artha.user.entity.UserCompanyRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyMemberEvent {
    private String eventType; // "MEMBER_ADDED", "MEMBER_REMOVED", "ROLE_CHANGED"
    private String companyId;
    private String companyName;
    private String targetUserId;
    private String targetUserEmail;
    private String targetUserFullName;
    private UserCompanyRole newRole;
}
