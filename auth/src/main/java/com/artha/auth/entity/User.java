package com.artha.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    private String providerId;

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

    /* ---------- UserDetails Implementation ---------- */

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(); // later you can return roles here
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;  // REQUIRED
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;  // you can customize later
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;   // using your active field
    }
}