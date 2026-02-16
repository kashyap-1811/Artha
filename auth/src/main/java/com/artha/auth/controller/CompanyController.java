package com.artha.auth.controller;

import com.artha.auth.dto.company.CompanyResponse;
import com.artha.auth.dto.company.CreateCompanyRequest;
import com.artha.auth.dto.userCompany.AddMemberRequest;
import com.artha.auth.dto.userCompany.CompanyMemberResponse;
import com.artha.auth.dto.userCompany.UserCompanyResponse;
import com.artha.auth.entity.Company;
import com.artha.auth.entity.User;
import com.artha.auth.services.ICompanyService;
import com.artha.auth.repository.UserCompanyRepository;
import com.artha.auth.mapper.CompanyMapper;
import com.artha.auth.mapper.UserCompanyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final ICompanyService companyService;
    private final UserCompanyRepository userCompanyRepository;

    /* ---------------- CREATE BUSINESS COMPANY ---------------- */

    @PostMapping
    public ResponseEntity<CompanyResponse> createCompany(
            @RequestHeader("X-USER-ID") String ownerUserId,
            @RequestBody CreateCompanyRequest request
    ) {
        User owner = User.builder()
                .id(ownerUserId)
                .build();

        Company company = Company.builder()
                .name(request.getName())
                .build();

        Company created = companyService.createCompanyWithOwner(owner, company);

        return ResponseEntity.ok(
                CompanyMapper.toResponse(created)
        );
    }

    /* ---------------- ADD MEMBER ---------------- */

    @PostMapping("/{companyId}/members")
    public ResponseEntity<CompanyResponse> addMember(
            @PathVariable String companyId,
            @RequestBody AddMemberRequest request
    ) {
        User user = User.builder()
                .id(request.getUserId())
                .build();

        Company company = Company.builder()
                .id(companyId)
                .build();

        Company updated = companyService.addMember(
                user,
                company,
                request.getRole()
        );

        return ResponseEntity.ok(
                CompanyMapper.toResponse(updated)
        );
    }

    /* ---------------- REMOVE MEMBER ---------------- */

    @DeleteMapping("/{companyId}/members/{userId}")
    public ResponseEntity<CompanyResponse> removeMember(
            @PathVariable String companyId,
            @PathVariable String userId
    ) {
        User user = User.builder().id(userId).build();
        Company company = Company.builder().id(companyId).build();

        Company updated = companyService.removeMember(user, company);

        return ResponseEntity.ok(
                CompanyMapper.toResponse(updated)
        );
    }

    /* ---------------- CHANGE ROLE ---------------- */

    @PutMapping("/{companyId}/members/{userId}/role")
    public ResponseEntity<CompanyResponse> changeRole(
            @PathVariable String companyId,
            @PathVariable String userId,
            @RequestParam String role
    ) {
        User user = User.builder().id(userId).build();
        Company company = Company.builder().id(companyId).build();

        Company updated = companyService.changeRole(
                user,
                company,
                Enum.valueOf(
                        com.artha.auth.entity.UserCompanyRole.class,
                        role
                )
        );

        return ResponseEntity.ok(
                CompanyMapper.toResponse(updated)
        );
    }

    /* ---------------- LIST USER COMPANIES ---------------- */

    @GetMapping("/my")
    public ResponseEntity<List<UserCompanyResponse>> getMyCompanies(
            @RequestHeader("X-USER-ID") String userId
    ) {
        List<UserCompanyResponse> response =
                userCompanyRepository
                        .findByUser_IdAndActiveTrue(userId)
                        .stream()
                        .map(UserCompanyMapper::toResponse)
                        .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{companyId}/members")
    public List<CompanyMemberResponse> getCompanyMembers(
            @PathVariable String companyId
    ) {
        return companyService.getCompanyMembers(companyId);
    }
}