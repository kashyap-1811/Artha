package com.artha.auth.controller;

import com.artha.auth.dto.user.CreateUserRequest;
import com.artha.auth.dto.user.UpdateUserRequest;
import com.artha.auth.dto.user.UserResponse;
import com.artha.auth.entity.User;
import com.artha.auth.services.IUserService;
import com.artha.auth.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final IUserService userService;

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
}