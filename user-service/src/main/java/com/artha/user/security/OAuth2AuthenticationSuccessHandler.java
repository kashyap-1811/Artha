package com.artha.user.security;

import com.artha.user.entity.User;
import com.artha.user.repository.UserRepository;
import com.artha.user.services.impl.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final UserService userService;

    @Value("${FRONTEND_URL:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String providerId = oAuth2User.getAttribute("sub"); // Google unique ID

        log.info("OAuth2 login success for email: {}, provider: google", email);

        Optional<User> userOptional = userRepository.findByEmail(email);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            // Update provider info if not set
            if (user.getProvider() == null) {
                user.setProvider("google");
                user.setProviderId(providerId);
                userRepository.save(user);
            }
        } else {
            // New user from Google
            user = User.builder()
                    .email(email)
                    .fullName(name)
                    .provider("google")
                    .providerId(providerId)
                    .active(true)
                    .build();
            
            user = userRepository.save(user);
            // Ensure they have a personal company as per system rules
            userService.ensurePersonalCompany(user.getId());
        }

        String token = jwtUtil.generateAccessToken(user);

        // Redirect back to frontend with the token
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth-callback")
                .queryParam("token", token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
