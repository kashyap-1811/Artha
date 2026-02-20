package com.artha.budget.service;

import com.artha.budget.entity.Action;

public interface AuthorizationService {
    void checkPermission(String userId, String companyId, Action action);
}
