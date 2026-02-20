package com.artha.user.services;

import com.artha.user.entity.UserCompanyRole;

public interface IUserCompanyService {

    /**
     * Returns the role of a user in a given company.
     * Throws IllegalArgumentException if the user is not a member of the company.
     */
    UserCompanyRole getUserRole(String userId, String companyId);
}
