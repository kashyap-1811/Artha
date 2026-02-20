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
    }

    /* ---------------- UPDATE PROFILE ---------------- */

    @PutMapping("/{userId}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable String userId,
            @RequestBody UpdateUserRequest request
    ) {
        User user = User.builder()
                .id(userId)
                .fullName(request.getFullName())
                .active(request.isActive())
                .build();

        User updated = userService.update(user);

        return ResponseEntity.ok(
                UserMapper.toResponse(updated)
        );
    }

    /* ---------------- GET USER ---------------- */

    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUser(
            @PathVariable String userId
    ) {
        return ResponseEntity.ok(
                UserMapper.toResponse(
                        userService.getById(userId)
                )
        );
    }

    /* ---------------- DELETE USER ---------------- */

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable String userId
    ) {
        userService.delete(userId);
        return ResponseEntity.noContent().build();
    }

    /* ---------------- GET USER ROLE IN COMPANY (Internal) ---------------- */

    @GetMapping("/{userId}/companies/{companyId}/role")
    public ResponseEntity<UserCompanyRole> getUserRole(
            @PathVariable String userId,
            @PathVariable String companyId
    ) {
        UserCompanyRole role = userCompanyService.getUserRole(userId, companyId);
        return ResponseEntity.ok(role);
    }
}