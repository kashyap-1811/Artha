package com.artha.auth.security;

import com.artha.auth.dto.auth.LoginResponse;
import com.artha.auth.services.AuthService;
import com.artha.auth.services.OAuth2AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final OAuth2AuthService oAuth2AuthService;
    private final ObjectMapper objectMapper;

//    http://localhost:8080/oauth2/login/google
    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2AuthenticationToken token =
                (OAuth2AuthenticationToken) authentication;

        OAuth2User oAuth2User =
                (OAuth2User) authentication.getPrincipal();

        LoginResponse loginResponse =
                oAuth2AuthService.handleOAuth2Login(
                        oAuth2User,
                        token.getAuthorizedClientRegistrationId()
                );

        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                objectMapper.writeValueAsString(loginResponse)
        );
    }
}