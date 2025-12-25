package com.artha.auth.mapper;

import com.artha.auth.dto.user.UserResponse;
import com.artha.auth.entity.User;

public class UserMapper {

    public static UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .active(user.isActive())
                .build();
    }
}