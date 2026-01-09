package com.artha.auth.services;

import com.artha.auth.dto.auth.LoginResponse;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public interface OAuth2AuthService {
    LoginResponse handleOAuth2Login(OAuth2User oAuth2User, String registrationId);
}
