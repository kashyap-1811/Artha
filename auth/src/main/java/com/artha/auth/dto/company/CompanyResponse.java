package com.artha.auth.dto.company;

import com.artha.auth.entity.CompanyType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CompanyResponse {
    private String id;
    private String name;
    private CompanyType type;
    private String ownerId;
}