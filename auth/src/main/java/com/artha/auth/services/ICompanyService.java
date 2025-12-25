package com.artha.auth.services;

import com.artha.auth.entity.Company;
import com.artha.auth.entity.UserCompanyRole;
import com.artha.auth.entity.User;

public interface ICompanyService {

    Company createCompanyWithOwner(User owner, Company company);

    Company addMember(User user, Company company, UserCompanyRole role);

    Company removeMember(User user, Company company);

    Company changeRole(User user, Company company, UserCompanyRole newRole);

    Company getById(String id);

    void delete(String id);
}