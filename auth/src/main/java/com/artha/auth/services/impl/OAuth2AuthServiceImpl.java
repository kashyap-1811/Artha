package com.artha.auth.services.impl;

import com.artha.auth.dto.auth.LoginResponse;
import com.artha.auth.entity.User;
import com.artha.auth.repository.UserRepository;
import com.artha.auth.security.AuthUtil;
import com.artha.auth.services.OAuth2AuthService;
import com.artha.auth.services.impl.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OAuth2AuthServiceImpl implements OAuth2AuthService {

    private final UserRepository userRepository;
    private final AuthUtil authUtil;
    private final UserService userService;

    @Override
    @Transactional
    public LoginResponse handleOAuth2Login(OAuth2User oAuth2User, String registrationId) {

        String providerId = oAuth2User.getAttribute("sub");   // Google unique ID
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        User user = userRepository.findByProviderId(providerId)
                .orElseGet(() -> {

                    if (email == null || email.isBlank()) {
                        throw new BadCredentialsException("Email not provided by OAuth2 provider");
                    }

                    return userRepository.findByEmail(email)
                            .orElseGet(() ->
                                    userService.create(
                                            User.builder()
                                                    .fullName(name)
                                                    .email(email)
                                                    .password(null)      // ✅ OAuth user
                                                    .providerId(providerId) // ✅ IMPORTANT
                                                    .active(true)
                                                    .build()
                                    )
                            );
                });

        return new LoginResponse(
                authUtil.generateAccessToken(user),
                user.getId()
        );
    }
}