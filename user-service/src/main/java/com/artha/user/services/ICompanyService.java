package com.artha.user.services;

import com.artha.user.dto.userCompany.CompanyMemberResponse;
import com.artha.user.entity.Company;
import com.artha.user.entity.UserCompanyRole;
import com.artha.user.entity.User;

import java.util.List;

public interface ICompanyService {

    Company createCompanyWithOwner(User owner, Company company);

    Company addMember(User user, Company company, UserCompanyRole role);

    Company removeMember(User user, Company company);

    Company changeRole(User user, Company company, UserCompanyRole newRole);

    Company getById(String id);

    void delete(String id);

    List<CompanyMemberResponse> getCompanyMembers(String companyId);

}