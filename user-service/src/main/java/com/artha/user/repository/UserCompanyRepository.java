package com.artha.user.repository;

import com.artha.user.entity.UserCompany;
import com.artha.user.entity.UserCompanyRole;
import com.artha.user.entity.CompanyType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserCompanyRepository extends JpaRepository<UserCompany, String> {

    // All companies of a user
    @EntityGraph(attributePaths = {"user", "company"})
    List<UserCompany> findByUser_IdAndActiveTrue(String userId);

    // Check if user belongs to a company (optimized to avoid joins)
    @Query("SELECT uc FROM UserCompany uc WHERE uc.user.id = :userId AND uc.company.id = :companyId")
    Optional<UserCompany> findByUser_IdAndCompany_Id(@Param("userId") String userId, @Param("companyId") String companyId);

    // Role check (authorization)
    @Query("SELECT uc FROM UserCompany uc WHERE uc.user.id = :userId AND uc.company.id = :companyId AND uc.role = :role")
    Optional<UserCompany> findByUser_IdAndCompany_IdAndRole(
            @Param("userId") String userId,
            @Param("companyId") String companyId,
            @Param("role") UserCompanyRole role
    );

    // Active membership by role within a company
    Optional<UserCompany> findFirstByCompany_IdAndRoleAndActiveTrue(
            String companyId,
            UserCompanyRole role
    );

    // Personal company membership for a user
    @EntityGraph(attributePaths = {"company"})
    Optional<UserCompany> findFirstByUser_IdAndCompany_TypeAndActiveTrue(
            String userId,
            CompanyType type
    );

    // All users of a company
    @EntityGraph(attributePaths = {"user", "company"})
    List<UserCompany> findByCompany_IdAndActiveTrue(String companyId);

    // Validation helper
    boolean existsByUser_IdAndCompany_Id(String userId, String companyId);
}
