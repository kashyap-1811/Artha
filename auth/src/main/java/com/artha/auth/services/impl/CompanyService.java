package com.artha.auth.services.impl;

import com.artha.auth.entity.*;
import com.artha.auth.repository.CompanyRepository;
import com.artha.auth.repository.UserCompanyRepository;
import com.artha.auth.repository.UserRepository;
import com.artha.auth.services.ICompanyService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class CompanyService implements ICompanyService {
    final private UserRepository userRepository;
    final private CompanyRepository companyRepository;
    final private UserCompanyRepository userCompanyRepository;

    @Override
    public Company createCompanyWithOwner(User user, Company company) {
        User persistedUser = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );

        Company savedCompany = companyRepository.save(company);

        UserCompany membership = UserCompany.builder()
                .id(new UserCompanyId(
                        persistedUser.getId(),
                        savedCompany.getId()
                ))
                .user(persistedUser)
                .company(savedCompany)
                .role(CompanyRole.OWNER)
                .build();

        userCompanyRepository.save(membership);

        return savedCompany;
    }

    @Override
    public Company update(Company company) {
        return companyRepository.save(company);
    }

    @Override
    public Company addMember(User user, Company company, CompanyRole role) {

        User persistedUser = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );

        Company persistedCompany = companyRepository.findById(company.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("Company not found: " + company.getId())
                );

        if (userCompanyRepository.existsByUser_IdAndCompany_Id(
                persistedUser.getId(),
                persistedCompany.getId()
        )) {
            throw new IllegalStateException("User is already a member of this company");
        }

        UserCompany membership = UserCompany.builder()
                .id(new UserCompanyId(
                        persistedUser.getId(),
                        persistedCompany.getId()
                ))
                .user(persistedUser)
                .company(persistedCompany)
                .role(role)
                .build();

        userCompanyRepository.save(membership);

        return persistedCompany;
    }

    @Override
    public Company removeMember(User user, Company company) {

        User persistedUser = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );

        Company persistedCompany = companyRepository.findById(company.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("Company not found: " + company.getId())
                );

        UserCompany membership = userCompanyRepository
                .findByUser_IdAndCompany_Id(
                        persistedUser.getId(),
                        persistedCompany.getId()
                )
                .orElseThrow(() ->
                        new IllegalStateException("User is not a member of this company")
                );

        if (membership.getRole() == CompanyRole.OWNER) {
            throw new IllegalStateException("OWNER cannot be removed from the company");
        }

        userCompanyRepository.delete(membership);

        return persistedCompany;
    }

    @Override
    public Company changeRole(User user, Company company, CompanyRole newRole) {

        User persistedUser = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );

        Company persistedCompany = companyRepository.findById(company.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("Company not found: " + company.getId())
                );

        UserCompany membership = userCompanyRepository
                .findByUser_IdAndCompany_Id(
                        persistedUser.getId(),
                        persistedCompany.getId()
                )
                .orElseThrow(() ->
                        new IllegalStateException("User is not a member of this company")
                );

        if (membership.getRole() == newRole) {
            return persistedCompany;
        }

        if (membership.getRole() == CompanyRole.OWNER && newRole != CompanyRole.OWNER) {

            long ownerCount = userCompanyRepository
                    .findByCompany_Id(persistedCompany.getId())
                    .stream()
                    .filter(uc -> uc.getRole() == CompanyRole.OWNER)
                    .count();

            if (ownerCount <= 1) {
                throw new IllegalStateException(
                        "Cannot change role: company must have at least one OWNER"
                );
            }
        }

        membership.setRole(newRole);
        userCompanyRepository.save(membership);

        return persistedCompany;
    }

    @Override
    public Company getById(String id) {
        return companyRepository.getReferenceById(id);
    }

    @Override
    public void delete(String id) {
        companyRepository.deleteById(id);
    }
}
