package com.artha.auth.repository;

import com.artha.auth.entity.UserCompany;
import com.artha.auth.entity.UserCompanyId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserCompanyRepository extends JpaRepository<UserCompany, UserCompanyId> {
    List<UserCompany> findByUser_Id(String userId);

    List<UserCompany> findByCompany_Id(String companyId);

    Optional<UserCompany> findByUser_IdAndCompany_Id(String userId, String companyId);

    boolean existsByUser_IdAndCompany_Id(String userId, String companyId);

}