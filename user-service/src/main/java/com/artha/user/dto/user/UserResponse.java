package com.artha.user.dto.user;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private String id;
    private String fullName;
    private String email;
    private boolean active;
    private String phoneNumber;
    private String bio;
    private String jobTitle;
    private java.time.Instant joinedAt;
    private java.util.List<UserCompanyResponse> memberships;
}