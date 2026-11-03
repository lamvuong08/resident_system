package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

public record NotificationRealtimeMessage(
        Long id,
        Long receiverId,
        String title,
        String content,
        String type,
        Boolean isRead,
        LocalDateTime createdAt,
        String actionUrl,
        String eventType
) {
    public NotificationRealtimeMessage(
            Long id,
            Long receiverId,
            String title,
            String content,
            String type,
            Boolean isRead,
            LocalDateTime createdAt,
            String actionUrl) {
        this(id, receiverId, title, content, type, isRead, createdAt, actionUrl, "NEW_NOTIFICATION");
    }
}
