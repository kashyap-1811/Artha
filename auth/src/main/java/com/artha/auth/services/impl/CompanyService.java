package com.artha.auth.services.impl;

import com.artha.auth.entity.*;
import com.artha.auth.repository.CompanyRepository;
import com.artha.auth.repository.UserCompanyRepository;
import com.artha.auth.repository.UserRepository;
import com.artha.auth.services.ICompanyService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class CompanyService implements ICompanyService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final UserCompanyRepository userCompanyRepository;

    @Override
    public Company createCompanyWithOwner(User owner, Company company) {

        User persistedUser = userRepository.findById(owner.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + owner.getId())
                );

        company.setType(CompanyType.BUSINESS);
        Company savedCompany = companyRepository.save(company);

        UserCompany uc = UserCompany.builder()
                .role(UserCompanyRole.OWNER)
                .active(true)
                .build();

        persistedUser.addUserCompany(uc);
        savedCompany.addUserCompany(uc);

        userCompanyRepository.save(uc);

        return savedCompany;
    }

    @Override
    public Company addMember(User user, Company company, UserCompanyRole role) {

        User persistedUser = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );

        Company persistedCompany = companyRepository.findById(company.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("Company not found: " + company.getId())
                );

        if (persistedCompany.getType() == CompanyType.PERSONAL) {
            throw new IllegalStateException("Cannot add members to PERSONAL company");
        }

        if (userCompanyRepository.existsByUser_IdAndCompany_Id(
                persistedUser.getId(),
                persistedCompany.getId()
        )) {
            throw new IllegalStateException("User already a member");
        }

        UserCompany uc = UserCompany.builder()
                .role(role)
                .active(true)
                .build();

        persistedUser.addUserCompany(uc);
        persistedCompany.addUserCompany(uc);

        userCompanyRepository.save(uc);

        return persistedCompany;
    }

    @Override
    public Company removeMember(User user, Company company) {

        UserCompany membership = userCompanyRepository
                .findByUser_IdAndCompany_Id(user.getId(), company.getId())
                .orElseThrow(() ->
                        new IllegalStateException("User not a member")
                );

        if (membership.getRole() == UserCompanyRole.OWNER) {
            throw new IllegalStateException("OWNER cannot be removed");
        }

        membership.getUser().removeUserCompany(membership);
        membership.getCompany().removeUserCompany(membership);

        userCompanyRepository.delete(membership);

        return membership.getCompany();
    }

    @Override
    public Company changeRole(User user, Company company, UserCompanyRole newRole) {

        UserCompany membership = userCompanyRepository
                .findByUser_IdAndCompany_Id(user.getId(), company.getId())
                .orElseThrow(() ->
                        new IllegalStateException("User not a member")
                );

        if (membership.getRole() == newRole) {
            return membership.getCompany();
        }

        if (membership.getRole() == UserCompanyRole.OWNER) {

            long ownerCount = userCompanyRepository
                    .findByCompany_IdAndActiveTrue(company.getId())
                    .stream()
                    .filter(uc -> uc.getRole() == UserCompanyRole.OWNER)
                    .count();

            if (ownerCount <= 1) {
                throw new IllegalStateException(
                        "Company must have at least one OWNER"
                );
            }
        }

        membership.setRole(newRole);
        userCompanyRepository.save(membership);

        return membership.getCompany();
    }

    @Override
    public Company getById(String id) {
        return companyRepository.findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException("Company not found: " + id)
                );
    }

    @Override
    public void delete(String id) {
        companyRepository.deleteById(id);
    }
}