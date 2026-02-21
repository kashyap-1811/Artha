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
    private final UserService userService; // Use existing UserService for creation logic (handles Company etc)
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public SignupResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        // Use UserService.create to handle side effects (Company creation) if any
        // Assuming UserService.create expects a User object with plain password? 
        // Wait, UserService.create used to encode password. I removed encoding from it. 
        // Code in UserService.create now says: "Password should be hashed by API Gateway or Caller".
        // So I should hash it here OR restore encoding in UserService. 
        // I will hash it here and pass hashed password to UserService if it expects it, 
        // OR better: pass plain and let UserService encode?
        // Let's check UserService again. It currently stores what is given.
        // So I will encode it here.

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(request.getPassword()) // Pass plain, let's see. UserService commented out encoding.
                .active(true)
                .build();
        
        // I need to ensure password is encoded. 
        // Let's rely on UserService to save, but I should set the encoded password on the user object before passing it,
        // OR modifying UserService to encode it.
        // Modifying UserService is cleaner as it enforces encoding. 
        // But for now, I'll encode it here.
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        
        User savedUser = userService.create(user);
        userService.ensurePersonalCompany(savedUser.getId());

        return new SignupResponse(savedUser.getId(), savedUser.getEmail());
    }

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow();
        
        String token = jwtUtil.generateAccessToken(user);
        
        return new LoginResponse(token, user.getId());
    }
}
