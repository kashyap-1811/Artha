package com.artha.expense.client;

import com.artha.expense.entity.UserCompanyRole;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

@Component
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);
    private final RestTemplate restTemplate;

    public UserServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${services.user-service.url}")
    private String userServiceUrl;

    public UserCompanyRole getUserRole(String userId, String companyId) {
        String url = userServiceUrl + "/api/companies/" + companyId + "/members/" + userId;

        try {
            return restTemplate.getForObject(url, UserCompanyRole.class);
        } catch (HttpClientErrorException e) {
            log.warn("User {} is not a member of company {} (status: {})", userId, companyId, e.getStatusCode());
            return null; // Not a member
        } catch (Exception e) {
            log.error("Failed to fetch user role from User Service", e);
            throw new RuntimeException("Authorization check failed", e);
        }
    }
}
