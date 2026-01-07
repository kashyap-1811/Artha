package com.artha.auth.controller;

import com.artha.auth.dto.auth.LoginRequest;
import com.artha.auth.dto.auth.LoginResponse;
import com.artha.auth.dto.auth.SignupRequest;
import com.artha.auth.dto.auth.SignupResponse;
import com.artha.auth.services.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(
                authService.login(request)
        );
    }

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(
            @RequestBody SignupRequest request
    ) {
        return ResponseEntity.ok(
                authService.signup(request)
        );
    }}