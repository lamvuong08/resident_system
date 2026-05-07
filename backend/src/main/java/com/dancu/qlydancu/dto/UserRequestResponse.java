package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

import com.dancu.qlydancu.model.enums.RequestStatus;
import com.dancu.qlydancu.model.enums.RequestType;

public class UserRequestResponse {
    private Long id;
    private RequestType type;
    private String apartmentCode; // Bổ sung field
    private String description;
    private RequestStatus status;
    private LocalDateTime createdAt;

    public UserRequestResponse() {
    }

    // Constructor cũ (dùng cho Service hiện tại của Resident)
    public UserRequestResponse(Long id, RequestType type, String description, RequestStatus status,
            LocalDateTime createdAt) {
        this.id = id;
        this.type = type;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
    }

    // Constructor mới (dùng cho Admin Service cần apartmentCode)
    public UserRequestResponse(Long id, RequestType type, String apartmentCode, String description, RequestStatus status,
            LocalDateTime createdAt) {
        this.id = id;
        this.type = type;
        this.apartmentCode = apartmentCode;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public RequestType getType() { return type; }
    public void setType(RequestType type) { this.type = type; }

    public String getApartmentCode() { return apartmentCode; }
    public void setApartmentCode(String apartmentCode) { this.apartmentCode = apartmentCode; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}