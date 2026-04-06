package com.artha.expense.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class BudgetServiceClient {

    private static final Logger log = LoggerFactory.getLogger(BudgetServiceClient.class);
    private final RestTemplate restTemplate;

    @Value("${API_GATEWAY_URL:http://api-gateway}")
    private String budgetServiceUrl;

    public BudgetServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Fetches the allocation category name from the budget service via the API Gateway internal route.
     * Uses /internal/budget/** which is whitelisted from JWT auth in the gateway.
     * Returns null if lookup fails.
     */
    public String getAllocationName(String userId, UUID budgetId, UUID allocationId) {
        // /internal/budget/** → gateway strips /internal/budget → budget-service gets /api/budgets/...
        String url = budgetServiceUrl + "/internal/budget/api/budgets/" + budgetId + "/details";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", userId);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, HttpMethod.GET, entity, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && body != null) {
                Object rawAllocations = body.get("allocations");
                if (rawAllocations instanceof List<?> allocations) {
                    for (Object a : allocations) {
                        if (a instanceof Map<?, ?> alloc) {
                            String aid = String.valueOf(alloc.get("id"));
                            if (aid.equals(allocationId.toString())) {
                                Object name = alloc.get("categoryName");
                                return name != null ? name.toString() : null;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not resolve allocation name for budget={} allocation={}: {}", budgetId, allocationId, e.getMessage());
        }
        return null;
    }

    /**
     * Fetches multiple allocation names in a single batch call.
     */
    public Map<UUID, String> getAllocationNamesBatch(String userId, List<UUID> allocationIds) {
        if (allocationIds == null || allocationIds.isEmpty()) {
            return Map.of();
        }
        
        String url = budgetServiceUrl + "/internal/budget/api/budgets/allocations/names";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", userId);
            HttpEntity<List<UUID>> entity = new HttpEntity<>(allocationIds, headers);

            ResponseEntity<Map<UUID, String>> response = restTemplate.exchange(
                url, 
                HttpMethod.POST, 
                entity, 
                new ParameterizedTypeReference<Map<UUID, String>>() {}
            );
            
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (Exception e) {
            log.warn("Could not resolve batch allocation names: {}", e.getMessage());
            return Map.of();
        }
    }
}
