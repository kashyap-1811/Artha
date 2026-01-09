package com.artha.auth.services.impl;

import com.artha.auth.dto.auth.LoginRequest;
import com.artha.auth.dto.auth.LoginResponse;
import com.artha.auth.dto.auth.SignupRequest;
import com.artha.auth.dto.auth.SignupResponse;
import com.artha.auth.entity.User;
import com.artha.auth.repository.UserRepository;
import com.artha.auth.security.AuthUtil;
import com.artha.auth.services.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final AuthUtil authUtil;
    private final UserService userService;
    private final UserRepository userRepository;

    @Override
    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        // 🚫 OAuth users cannot login with password
        if (user.getPassword() == null) {
            throw new BadCredentialsException(
                    "This account uses social login. Please login with Google."
            );
        }

        Authentication authentication =
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                request.getEmail(),
                                request.getPassword()
                        )
                );

        String token = authUtil.generateAccessToken(user);

        return new LoginResponse(token, user.getId());
    }
    public User signUpInternal(SignupRequest request)
    {
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(request.getPassword()) // raw, encoded in service
                .active(true)
                .build();

        User savedUser = userService.create(user);
        return savedUser;
    }

    @Override
    public SignupResponse signup(SignupRequest request) {

        User savedUser = signUpInternal(request);

        return new SignupResponse(
                savedUser.getId(),
                savedUser.getEmail()
        );
    }
}