package com.artha.budget.service.impl;

import com.artha.budget.client.UserServiceClient;
import com.artha.budget.entity.Action;
import com.artha.budget.entity.UserCompanyRole;
import com.artha.budget.exception.AccessDeniedException;
import com.artha.budget.service.AuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
public class RemoteAuthorizationService implements AuthorizationService {

    private final UserServiceClient userServiceClient;

    public RemoteAuthorizationService(UserServiceClient userServiceClient) {
        this.userServiceClient = userServiceClient;
    }

    @Override
    public void checkPermission(String userId, String companyId, Action action) {
        if (userId == null || companyId == null) {
            throw new AccessDeniedException("Missing userId or companyId for authorization");
        }

        UserCompanyRole role = userServiceClient.getUserRole(userId, companyId);
        if (role == null) {
            throw new AccessDeniedException("User is not a member of this company");
        }

        if (!isActionAllowed(role, action)) {
            throw new AccessDeniedException("User role " + role + " is not authorized to perform " + action);
        }
    }

    private boolean isActionAllowed(UserCompanyRole role, Action action) {
        if (role == UserCompanyRole.OWNER) {
            return true;
        }

        if (role == UserCompanyRole.MEMBER) {
            return action != Action.DELETE_BUDGET && action != Action.DELETE_EXPENSE;
        }

        if (role == UserCompanyRole.VIEWER) {
            return action == Action.VIEW_BUDGET || action == Action.VIEW_EXPENSE;
        }

        return false;
    }
}
