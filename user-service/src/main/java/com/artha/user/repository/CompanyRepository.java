package com.artha.user.repository;

import com.artha.user.entity.Company;
import com.artha.user.entity.CompanyType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompanyRepository extends JpaRepository<Company, String> {
    List<Company> findByType(CompanyType type);
}