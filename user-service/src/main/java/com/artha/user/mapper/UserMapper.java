package com.artha.user.mapper;

import com.artha.user.dto.user.UserCompanyResponse;
import com.artha.user.entity.CompanyType;
import com.artha.user.entity.User;
import com.artha.user.dto.user.UserResponse;

import java.util.stream.Collectors;

public class UserMapper {
    public static UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .active(user.isActive())
                .phoneNumber(user.getPhoneNumber())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .joinedAt(user.getJoinedAt())
                .memberships(user.getUserCompanies().stream()
                        .filter(uc -> uc.getCompany().getType() == CompanyType.BUSINESS)
                        .map(uc -> UserCompanyResponse.builder()
                                .companyId(uc.getCompany().getId())
                                .companyName(uc.getCompany().getName())
                                .role(uc.getRole())
                                .active(uc.isActive())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }
}