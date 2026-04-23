package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

public record NotificationResponse(
    Long id,
    String title,
    String content,
    String type,
    String createdBy, // Chỉ trả về tên người tạo, không trả nguyên Object User
    LocalDateTime createdAt
) {}
