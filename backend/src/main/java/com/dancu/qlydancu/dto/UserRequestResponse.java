package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.dancu.qlydancu.model.enums.RequestStatus;
import com.dancu.qlydancu.model.enums.RequestType;

public class UserRequestResponse {
    private Long id;
    private RequestType type;
    private String description;
    private RequestStatus status;
    private LocalDateTime createdAt;
    private List<UserRequestAttachmentDto> attachments;

    public UserRequestResponse() {}

    public UserRequestResponse(Long id, RequestType type, String description, RequestStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.type = type;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public RequestType getType() { return type; }
    public void setType(RequestType type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<UserRequestAttachmentDto> getAttachments() { return attachments; }
    public void setAttachments(List<UserRequestAttachmentDto> attachments) { this.attachments = attachments; }
}