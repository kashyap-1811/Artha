package com.artha.auth.repository;

import com.artha.auth.entity.Company;
import com.artha.auth.entity.CompanyType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompanyRepository extends JpaRepository<Company, String> {
    List<Company> findByType(CompanyType type);
}