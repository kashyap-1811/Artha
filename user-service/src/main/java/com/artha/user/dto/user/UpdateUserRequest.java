package com.artha.user.dto.user;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String fullName;
    private boolean active;
    private String phoneNumber;
    private String bio;
    private String jobTitle;
}