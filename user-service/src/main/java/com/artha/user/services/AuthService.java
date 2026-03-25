package com.artha.user.services;

import com.artha.user.dto.auth.LoginRequest;
import com.artha.user.dto.auth.LoginResponse;
import com.artha.user.dto.auth.SignupRequest;
import com.artha.user.dto.auth.SignupResponse;
import com.artha.user.entity.User;
import com.artha.user.repository.UserRepository;
import com.artha.user.security.JwtUtil;
import com.artha.user.services.impl.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public SignupResponse signup(SignupRequest request) {
        long dbStart = System.currentTimeMillis();
        boolean exists = userRepository.existsByEmail(request.getEmail());
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Auth Signup]: Check Email " + (dbEnd - dbStart) + "ms ======");

        if (exists) {
            throw new RuntimeException("Email already in use");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(request.getPassword()) 
                .active(true)
                .build();
        
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        
        User savedUser = userService.create(user);
        userService.ensurePersonalCompany(savedUser.getId());

        return new SignupResponse(savedUser.getId(), savedUser.getEmail());
    }

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        long dbStart = System.currentTimeMillis();
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow();
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Auth Login]: Find User " + (dbEnd - dbStart) + "ms ======");
        
        String token = jwtUtil.generateAccessToken(user);
        
        return new LoginResponse(token, user.getId());
    }
}
