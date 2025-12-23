package com.artha.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CompanyType type;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Builder.Default
    @OneToMany(
            mappedBy = "company",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private Set<UserCompany> userCompanies = new HashSet<>();

    /* ---------- Lifecycle ---------- */

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    /* ---------- Domain Methods ---------- */

    public void addUserCompany(UserCompany uc) {
        userCompanies.add(uc);
        uc.setCompany(this);
    }

    public void removeUserCompany(UserCompany uc) {
        userCompanies.remove(uc);
        uc.setCompany(null);
    }
}