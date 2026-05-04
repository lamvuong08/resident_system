package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

public record ResidentNotificationListItemResponse(
        Long id,
        String title,
        String content,
        String type,
        Boolean isRead,
        LocalDateTime createdAt) {
}
