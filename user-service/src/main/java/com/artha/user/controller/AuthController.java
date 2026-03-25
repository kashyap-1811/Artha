package com.artha.user.controller;

import com.artha.user.dto.auth.LoginRequest;
import com.artha.user.dto.auth.LoginResponse;
import com.artha.user.dto.auth.SignupRequest;
import com.artha.user.dto.auth.SignupResponse;
import com.artha.user.services.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@RequestBody SignupRequest request) {
        long serviceStart = System.currentTimeMillis();
        try {
            return ResponseEntity.ok(authService.signup(request));
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Auth Signup]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        long serviceStart = System.currentTimeMillis();
        try {
            return ResponseEntity.ok(authService.login(request));
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Auth Login]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    @GetMapping("/hello")
    public ResponseEntity<String> hello() {
        long serviceStart = System.currentTimeMillis();
        try {
            return ResponseEntity.ok("hello from user-service");
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Auth Hello]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }
}
