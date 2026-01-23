package com.artha.auth.dto;

import lombok.Data;

@Data
public class CreateCompanyRequest {
    private String name;
    private String type;
}
