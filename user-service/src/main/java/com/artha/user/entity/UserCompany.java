package com.artha.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "user_companies",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"user_id", "company_id"})
        },
        indexes = {
                @Index(name = "idx_usercompany_company_active", columnList = "company_id, active"),
                @Index(name = "idx_usercompany_user_active", columnList = "user_id, active")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCompany {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserCompanyRole role;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private Instant joinedAt;

    /* ---------- Lifecycle ---------- */

    @PrePersist
    protected void onCreate() {
        this.joinedAt = Instant.now();
    }
}