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

    @Column(nullable = false)
    private boolean active = true;

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