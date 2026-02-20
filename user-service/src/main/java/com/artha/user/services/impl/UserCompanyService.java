package com.artha.user.services.impl;

import com.artha.user.entity.UserCompany;
import com.artha.user.entity.UserCompanyRole;
import com.artha.user.repository.UserCompanyRepository;
import com.artha.user.services.IUserCompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserCompanyService implements IUserCompanyService {

    private final UserCompanyRepository userCompanyRepository;

    @Override
    public UserCompanyRole getUserRole(String userId, String companyId) {
        UserCompany uc = userCompanyRepository
                .findByUser_IdAndCompany_Id(userId, companyId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User is not a member of this company"
                ));
        return uc.getRole();
    }
}
