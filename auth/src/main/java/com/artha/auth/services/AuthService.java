package com.artha.auth.services;

import com.artha.auth.dto.auth.LoginRequest;
import com.artha.auth.dto.auth.LoginResponse;
import com.artha.auth.dto.auth.SignupRequest;
import com.artha.auth.dto.auth.SignupResponse;
import org.jspecify.annotations.Nullable;

public interface AuthService {
    LoginResponse login(LoginRequest request);

    SignupResponse signup(SignupRequest request);
}