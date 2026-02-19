package com.artha.user.dto;

import lombok.Data;

@Data
public class CreateCompanyRequest {
    private String name;
    private String type;
}
