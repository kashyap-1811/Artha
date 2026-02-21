package com.artha.user.repository;

import com.artha.user.entity.UserCompany;
import com.artha.user.entity.UserCompanyRole;
import com.artha.user.entity.CompanyType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserCompanyRepository extends JpaRepository<UserCompany, String> {

    // All companies of a user
    List<UserCompany> findByUser_IdAndActiveTrue(String userId);

    // Check if user belongs to a company
    Optional<UserCompany> findByUser_IdAndCompany_Id(String userId, String companyId);

    // Role check (authorization)
    Optional<UserCompany> findByUser_IdAndCompany_IdAndRole(
            String userId,
            String companyId,
            UserCompanyRole role
    );

    // Active membership by role within a company
    Optional<UserCompany> findFirstByCompany_IdAndRoleAndActiveTrue(
            String companyId,
            UserCompanyRole role
    );

    // Personal company membership for a user
    Optional<UserCompany> findFirstByUser_IdAndCompany_TypeAndActiveTrue(
            String userId,
            CompanyType type
    );

    // All users of a company
    List<UserCompany> findByCompany_IdAndActiveTrue(String companyId);

    // Validation helper
    boolean existsByUser_IdAndCompany_Id(String userId, String companyId);
}
