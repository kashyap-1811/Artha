package com.artha.auth.repository;

import com.artha.auth.entity.UserCompany;
import com.artha.auth.entity.UserCompanyRole;
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

    // All users of a company
    List<UserCompany> findByCompany_IdAndActiveTrue(String companyId);

    // Validation helper
    boolean existsByUser_IdAndCompany_Id(String userId, String companyId);
}