package com.dancu.qlydancu.dto;

import com.dancu.qlydancu.model.enums.RequestType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UserRequestCreateRequest {
    
    @NotNull(message = "Loại yêu cầu không được để trống")
    private RequestType type;

    @NotBlank(message = "Nội dung mô tả không được để trống")
    private String description;

    public UserRequestCreateRequest() {}

    public UserRequestCreateRequest(RequestType type, String description) {
        this.type = type;
        this.description = description;
    }

    public RequestType getType() { return type; }
    public void setType(RequestType type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}