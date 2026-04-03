package com.artha.user.services.impl;

import com.artha.user.dto.userCompany.CompanyMemberResponse;
import com.artha.user.dto.event.CompanyMemberEvent;
import com.artha.user.entity.*;
import com.artha.user.repository.CompanyRepository;
import com.artha.user.repository.UserCompanyRepository;
import com.artha.user.repository.UserRepository;
import com.artha.user.services.ICompanyService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CompanyService implements ICompanyService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final UserCompanyRepository userCompanyRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    public Company createCompanyWithOwner(User owner, Company company) {

        long dbStart1 = System.currentTimeMillis();
        User persistedUser = userRepository.findById(owner.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + owner.getId())
                );
        long dbEnd1 = System.currentTimeMillis();

        company.setType(CompanyType.BUSINESS);
        
        long dbStart2 = System.currentTimeMillis();
        Company savedCompany = companyRepository.save(company);
        long dbEnd2 = System.currentTimeMillis();

        UserCompany uc = UserCompany.builder()
                .role(UserCompanyRole.OWNER)
                .active(true)
                .build();

        persistedUser.addUserCompany(uc);
        savedCompany.addUserCompany(uc);

        long dbStart3 = System.currentTimeMillis();
        userCompanyRepository.save(uc);
        long dbEnd3 = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Create Company]: User " + (dbEnd1 - dbStart1) + "ms, Company " + (dbEnd2 - dbStart2) + "ms, Association " + (dbEnd3 - dbStart3) + "ms ======");

        return savedCompany;
    }

    @Override
    public Company addMember(User user, Company company, UserCompanyRole role) {

        long dbStart1 = System.currentTimeMillis();
        User persistedUser = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );
        long dbEnd1 = System.currentTimeMillis();

        long dbStart2 = System.currentTimeMillis();
        Company persistedCompany = companyRepository.findById(company.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("Company not found: " + company.getId())
                );
        long dbEnd2 = System.currentTimeMillis();

        if (persistedCompany.getType() == CompanyType.PERSONAL) {
            throw new IllegalStateException("Cannot add members to PERSONAL company");
        }

        long dbStart3 = System.currentTimeMillis();
        boolean exists = userCompanyRepository.existsByUser_IdAndCompany_Id(persistedUser.getId(), persistedCompany.getId());
        long dbEnd3 = System.currentTimeMillis();

        if (exists) {
            throw new IllegalStateException("User already a member");
        }

        UserCompany uc = UserCompany.builder()
                .role(role)
                .active(true)
                .build();

        persistedUser.addUserCompany(uc);
        persistedCompany.addUserCompany(uc);

        long dbStart4 = System.currentTimeMillis();
        userCompanyRepository.save(uc);
        long dbEnd4 = System.currentTimeMillis();

        System.out.println("====== DB Execution Time [Add Member]: LookupUser " + (dbEnd1 - dbStart1) + "ms, LookupComp " + (dbEnd2 - dbStart2) + "ms, Check " + (dbEnd3 - dbStart3) + "ms, Save " + (dbEnd4 - dbStart4) + "ms ======");

        CompanyMemberEvent event = CompanyMemberEvent.builder()
                .eventType("MEMBER_ADDED")
                .companyId(persistedCompany.getId())
                .companyName(persistedCompany.getName())
                .targetUserId(persistedUser.getId())
                .targetUserEmail(persistedUser.getEmail())
                .targetUserFullName(persistedUser.getFullName())
                .newRole(role)
                .build();
        kafkaTemplate.send("company-events", event);

        return persistedCompany;
    }

    @Override
    public Company removeMember(User user, Company company) {

        long dbStart1 = System.currentTimeMillis();
        UserCompany membership = userCompanyRepository
                .findByUser_IdAndCompany_Id(user.getId(), company.getId())
                .orElseThrow(() ->
                        new IllegalStateException("User not a member")
                );
        long dbEnd1 = System.currentTimeMillis();

        if (membership.getRole() == UserCompanyRole.OWNER) {
            throw new IllegalStateException("OWNER cannot be removed");
        }

        Company targetCompany = membership.getCompany();

        CompanyMemberEvent event = CompanyMemberEvent.builder()
                .eventType("MEMBER_REMOVED")
                .companyId(targetCompany.getId())
                .companyName(targetCompany.getName())
                .targetUserId(membership.getUser().getId())
                .targetUserEmail(membership.getUser().getEmail())
                .targetUserFullName(membership.getUser().getFullName())
                .newRole(null) // role doesn't matter when removed
                .build();
        kafkaTemplate.send("company-events", event);

        membership.getUser().removeUserCompany(membership);
        targetCompany.removeUserCompany(membership);

        long dbStart2 = System.currentTimeMillis();
        userCompanyRepository.delete(membership);
        long dbEnd2 = System.currentTimeMillis();

        System.out.println("====== DB Execution Time [Remove Member]: FindMembership " + (dbEnd1 - dbStart1) + "ms, Delete " + (dbEnd2 - dbStart2) + "ms ======");

        return targetCompany;
    }

    @Override
    public Company changeRole(User user, Company company, UserCompanyRole newRole) {

        long dbStart1 = System.currentTimeMillis();
        UserCompany membership = userCompanyRepository
                .findByUser_IdAndCompany_Id(user.getId(), company.getId())
                .orElseThrow(() ->
                        new IllegalStateException("User not a member")
                );
        long dbEnd1 = System.currentTimeMillis();

        if (membership.getRole() == newRole) {
            return membership.getCompany();
        }

        if (membership.getRole() == UserCompanyRole.OWNER) {

            long dbStart2 = System.currentTimeMillis();
            long ownerCount = userCompanyRepository
                    .findByCompany_IdAndActiveTrue(company.getId())
                    .stream()
                    .filter(uc -> uc.getRole() == UserCompanyRole.OWNER)
                    .count();
            long dbEnd2 = System.currentTimeMillis();
            System.out.println("====== DB Execution Time [Check Owners]: " + (dbEnd2 - dbStart2) + "ms ======");

            if (ownerCount <= 1) {
                throw new IllegalStateException(
                        "Company must have at least one OWNER"
                );
            }
        }

        membership.setRole(newRole);
        long dbStart3 = System.currentTimeMillis();
        userCompanyRepository.save(membership);
        long dbEnd3 = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Change Role]: Find " + (dbEnd1 - dbStart1) + "ms, Save " + (dbEnd3 - dbStart3) + "ms ======");

        CompanyMemberEvent event = CompanyMemberEvent.builder()
                .eventType("ROLE_CHANGED")
                .companyId(company.getId())
                .companyName(membership.getCompany().getName())
                .targetUserId(membership.getUser().getId())
                .targetUserEmail(membership.getUser().getEmail())
                .targetUserFullName(membership.getUser().getFullName())
                .newRole(newRole)
                .build();
        kafkaTemplate.send("company-events", event);

        return membership.getCompany();
    }

    @Override
    public Company getById(String id) {
        long dbStart = System.currentTimeMillis();
        Company company = companyRepository.findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException("Company not found: " + id)
                );
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get Company By Id]: " + (dbEnd - dbStart) + "ms ======");
        return company;
    }

    @Override
    public void delete(String id) {
        long dbStart = System.currentTimeMillis();
        companyRepository.deleteById(id);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Delete Company]: " + (dbEnd - dbStart) + "ms ======");
    }

    @Override
    public List<CompanyMemberResponse> getCompanyMembers(String companyId) {

        long dbStart = System.currentTimeMillis();
        List<UserCompany> companyUsers =
                userCompanyRepository.findByCompany_IdAndActiveTrue(companyId);
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get Company Members]: " + (dbEnd - dbStart) + "ms ======");

        return companyUsers.stream()
                .map(cu -> CompanyMemberResponse.builder()
                        .userId(cu.getUser().getId())
                        .fullName(cu.getUser().getFullName())
                        .email(cu.getUser().getEmail())
                        .role(cu.getRole())
                        .active(cu.getUser().isActive())
                        .build()
                )
                .toList();
    }
}
