package com.artha.user.mapper;

import com.artha.user.dto.user.UserResponse;
import com.artha.user.entity.User;

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