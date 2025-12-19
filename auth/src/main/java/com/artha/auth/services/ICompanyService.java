package com.artha.auth.services;

import com.artha.auth.entity.Company;
import com.artha.auth.entity.CompanyRole;
import com.artha.auth.entity.User;

public interface ICompanyService {
    Company createCompanyWithOwner(User user, Company company);

    Company update(Company company);

    Company addMember(User user, Company company, CompanyRole role);

    Company removeMember(User user, Company company);

    Company changeRole(User user, Company company, CompanyRole newRole);

    Company getById(String id);

    void delete(String id);
}
