package com.artha.user.controller;

import com.artha.user.dto.company.CompanyResponse;
import com.artha.user.dto.company.CreateCompanyRequest;
import com.artha.user.dto.userCompany.AddMemberRequest;
import com.artha.user.dto.userCompany.CompanyMemberResponse;
import com.artha.user.dto.userCompany.UserCompanyResponse;
import com.artha.user.entity.Company;
import com.artha.user.entity.User;
import com.artha.user.entity.UserCompanyRole;
import com.artha.user.services.ICompanyService;
import com.artha.user.services.IUserService;
import com.artha.user.repository.UserCompanyRepository;
import com.artha.user.mapper.CompanyMapper;
import com.artha.user.mapper.UserCompanyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final ICompanyService companyService;
    private final IUserService userService;
    private final UserCompanyRepository userCompanyRepository;

    /* ---------------- CREATE BUSINESS COMPANY ---------------- */

    @PostMapping
    public ResponseEntity<CompanyResponse> createCompany(
            @RequestHeader("X-USER-ID") String ownerUserId,
            @RequestBody CreateCompanyRequest request
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            User owner = User.builder()
                    .id(ownerUserId)
                    .build();

            Company company = Company.builder()
                    .name(request.getName())
                    .build();

            Company created = companyService.createCompanyWithOwner(owner, company);

            return ResponseEntity.ok(
                    CompanyMapper.toResponse(created, ownerUserId)
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Create Company]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- ADD MEMBER ---------------- */

    @PostMapping("/{companyId}/members")
    public ResponseEntity<CompanyResponse> addMember(
            @PathVariable String companyId,
            @RequestBody AddMemberRequest request
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
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
                    CompanyMapper.toResponse(updated, resolveOwnerId(updated.getId()))
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Add Member]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- REMOVE MEMBER ---------------- */

    @DeleteMapping("/{companyId}/members/{userId}")
    public ResponseEntity<CompanyResponse> removeMember(
            @PathVariable String companyId,
            @PathVariable String userId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            User user = User.builder().id(userId).build();
            Company company = Company.builder().id(companyId).build();

            Company updated = companyService.removeMember(user, company);

            return ResponseEntity.ok(
                    CompanyMapper.toResponse(updated, resolveOwnerId(updated.getId()))
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Remove Member]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- CHANGE ROLE ---------------- */

    @PutMapping("/{companyId}/members/{userId}/role")
    public ResponseEntity<CompanyMemberResponse> changeRole(
            @PathVariable String companyId,
            @PathVariable String userId,
            @RequestParam String role
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            User user = User.builder().id(userId).build();
            Company company = Company.builder().id(companyId).build();

            companyService.changeRole(
                    user,
                    company,
                    Enum.valueOf(
                            com.artha.user.entity.UserCompanyRole.class,
                            role
                    )
            );

            com.artha.user.entity.UserCompany updatedMembership = userCompanyRepository
                    .findByUser_IdAndCompany_Id(userId, companyId)
                    .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User is not a member of this company"));

            return ResponseEntity.ok(
                    CompanyMemberResponse.builder()
                            .userId(updatedMembership.getUser().getId())
                            .fullName(updatedMembership.getUser().getFullName())
                            .email(updatedMembership.getUser().getEmail())
                            .role(updatedMembership.getRole())
                            .active(updatedMembership.getUser().isActive())
                            .build()
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Change Member Role]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- LIST USER COMPANIES ---------------- */

    @GetMapping("/my")
    public ResponseEntity<List<UserCompanyResponse>> getMyCompanies(
            @RequestHeader("X-USER-ID") String userId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            List<UserCompanyResponse> response =
                    userCompanyRepository
                            .findByUser_IdAndActiveTrue(userId)
                            .stream()
                            .map(UserCompanyMapper::toResponse)
                            .toList();

            return ResponseEntity.ok(response);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get My Companies]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    @GetMapping("/my/personal")
    public ResponseEntity<CompanyResponse> getMyPersonalCompany(
            @RequestHeader("X-USER-ID") String userId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            Company personalCompany = userService.ensurePersonalCompany(userId);
            return ResponseEntity.ok(
                    CompanyMapper.toResponse(personalCompany, resolveOwnerId(personalCompany.getId()))
            );
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get My Personal Company]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    @GetMapping("/{companyId}/members")
    public List<CompanyMemberResponse> getCompanyMembers(
            @PathVariable String companyId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            return companyService.getCompanyMembers(companyId);
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Company Members]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    /* ---------------- GET MEMBER ROLE (Internal) ---------------- */

    @GetMapping("/{companyId}/members/{userId}")
    public ResponseEntity<com.artha.user.entity.UserCompanyRole> getMemberRole(
            @PathVariable String companyId,
            @PathVariable String userId
    ) {
        long serviceStart = System.currentTimeMillis();
        try {
            com.artha.user.entity.UserCompany uc = userCompanyRepository
                    .findByUser_IdAndCompany_Id(userId, companyId)
                    .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User is not a member of this company"));
            return ResponseEntity.ok(uc.getRole());
        } finally {
            long serviceEnd = System.currentTimeMillis();
            System.out.println("====== Service Execution Time [Get Member Role]: " + (serviceEnd - serviceStart) + "ms ======");
        }
    }

    private String resolveOwnerId(String companyId) {
        return userCompanyRepository
                .findFirstByCompany_IdAndRoleAndActiveTrue(companyId, UserCompanyRole.OWNER)
                .map(uc -> uc.getUser().getId())
                .orElse(null);
    }
}
