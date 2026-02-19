package com.artha.user.dto.company;

import com.artha.user.entity.CompanyType;
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