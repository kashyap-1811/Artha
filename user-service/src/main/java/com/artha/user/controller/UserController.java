package com.artha.user.controller;

import com.artha.user.dto.user.CreateUserRequest;
import com.artha.user.dto.user.UpdateUserRequest;
import com.artha.user.dto.user.UserResponse;
import com.artha.user.entity.User;
import com.artha.user.entity.UserCompanyRole;
import com.artha.user.services.IUserService;
import com.artha.user.services.IUserCompanyService;
import com.artha.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final IUserService userService;
    private final IUserCompanyService userCompanyService;

    /* ---------------- CREATE USER (SIGNUP) ---------------- */

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @RequestBody CreateUserRequest request
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            User user = User.builder()
                    .fullName(request.getFullName())
                    .email(request.getEmail())
                    .password(request.getPassword())
                    .active(true)
                    .build();

            User savedUser = userService.create(user);

            return ResponseEntity.ok(
                    UserMapper.toResponse(savedUser)
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Create User]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- UPDATE PROFILE ---------------- */

    @PutMapping("/{userId}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable String userId,
            @RequestBody UpdateUserRequest request
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            User user = User.builder()
                    .id(userId)
                    .fullName(request.getFullName())
                    .phoneNumber(request.getPhoneNumber())
                    .bio(request.getBio())
                    .jobTitle(request.getJobTitle())
                    .active(request.isActive())
                    .build();

            User updated = userService.update(user);

            return ResponseEntity.ok(
                    UserMapper.toResponse(updated)
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Update User]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- GET USER ---------------- */

    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUser(
            @PathVariable String userId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return ResponseEntity.ok(
                    UserMapper.toResponse(
                            userService.getById(userId)
                    )
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get User By ID]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- GET USER BY EMAIL ---------------- */

    @GetMapping("/by-email")
    public ResponseEntity<UserResponse> getUserByEmail(
            @RequestParam String email
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return ResponseEntity.ok(
                    UserMapper.toResponse(
                            userService.getByEmail(email)
                    )
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get User By Email]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- DELETE USER ---------------- */

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable String userId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            userService.delete(userId);
            return ResponseEntity.noContent().build();
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Delete User]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- GET USER ROLE IN COMPANY (Internal) ---------------- */

    @GetMapping("/{userId}/companies/{companyId}/role")
    public ResponseEntity<UserCompanyRole> getUserRole(
            @PathVariable String userId,
            @PathVariable String companyId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            UserCompanyRole role = userCompanyService.getUserRole(userId, companyId);
            return ResponseEntity.ok(role);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get User Role]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }
}