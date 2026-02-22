package com.artha.budget.client;

import com.artha.budget.entity.UserCompanyRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

/**
 * Calls User Service to fetch a user's role in a given company.
 * The Gateway already validated the JWT – we trust the X-User-Id header.
 */
@Component
public class UserServiceClient {

    private final RestTemplate restTemplate;

    public UserServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${services.user-service.url}")
    private String userServiceUrl;

    /**
     * Returns the role, or throws IllegalArgumentException if the user
     * is not a member of the company.
     */
    public UserCompanyRole getUserRole(String userId, String companyId) {
        String url = userServiceUrl
                + "/api/users/" + userId
                + "/companies/" + companyId
                + "/role";
        try {
            return restTemplate.getForObject(url, UserCompanyRole.class);
        } catch (HttpClientErrorException e) {
            return null; // RemoteAuthorizationService will throw AccessDeniedException
        }
    }
}
