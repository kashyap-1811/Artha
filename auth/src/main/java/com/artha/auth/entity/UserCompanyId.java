package com.artha.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserCompanyId implements Serializable {

    @Column(name = "user_id")
    private String userId;

    @Column(name = "company_id")
    private String companyId;
}
