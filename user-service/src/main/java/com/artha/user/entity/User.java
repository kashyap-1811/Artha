package com.artha.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;



    @Column(nullable = true)
    private String password;

    @Column(nullable = true)
    private String provider; // e.g., "google"

    @Column(nullable = true)
    private String providerId; // Unique ID from OAuth provider

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
    
    @Column(nullable = true)
    private String phoneNumber;
    
    @Column(nullable = true, length = 1000)
    private String bio;
    
    @Column(nullable = true)
    private String jobTitle;

    @Column(nullable = true, updatable = false)
    private java.time.Instant joinedAt;

    @PrePersist
    protected void onCreate() {
        this.joinedAt = java.time.Instant.now();
    }

    @Builder.Default
    @OneToMany(
            mappedBy = "user",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private Set<UserCompany> userCompanies = new HashSet<>();

    /* ---------- Domain Helpers ---------- */

    public void addUserCompany(UserCompany uc) {
        userCompanies.add(uc);
        uc.setUser(this);
    }

    public void removeUserCompany(UserCompany uc) {
        userCompanies.remove(uc);
        uc.setUser(null);
    }

}