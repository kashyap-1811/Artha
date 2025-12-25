package com.artha.auth.dto.user;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private String id;
    private String fullName;
    private String email;
    private boolean active;
}