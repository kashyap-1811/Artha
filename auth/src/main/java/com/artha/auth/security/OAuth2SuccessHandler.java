package com.artha.auth.security;

import com.artha.auth.dto.auth.LoginResponse;
import com.artha.auth.services.OAuth2AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

        private final OAuth2AuthService oAuth2AuthService;

        @Value("${app.frontend.redirect-url}")
        private String frontendRedirectUrl;

        // http://localhost:8083/oauth2/login/google
        @Override
        public void onAuthenticationSuccess(
                        HttpServletRequest request,
                        HttpServletResponse response,
                        Authentication authentication) throws IOException {

                OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;

                OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

                LoginResponse loginResponse = oAuth2AuthService.handleOAuth2Login(
                                oAuth2User,
                                token.getAuthorizedClientRegistrationId());

                // Redirect to frontend with token
                String redirectUrl = String.format("%s?token=%s&userId=%s",
                                frontendRedirectUrl,
                                loginResponse.getJwt(),
                                loginResponse.getUserId());

                response.sendRedirect(redirectUrl);
        }
}