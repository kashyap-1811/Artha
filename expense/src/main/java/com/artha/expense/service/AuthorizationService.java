package com.artha.expense.service;

import com.artha.expense.entity.Action;

public interface AuthorizationService {
    void checkPermission(String userId, String companyId, Action action);
}
