package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

public record NotificationResponse(
    Long id,
    String title,
    String content,
    String type,
    String createdBy, 
    LocalDateTime createdAt
) {}
