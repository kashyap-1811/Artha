package com.artha.auth.dto.user;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String fullName;
    private boolean active;
}