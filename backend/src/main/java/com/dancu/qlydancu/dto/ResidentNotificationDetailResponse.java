package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ResidentNotificationDetailResponse(
        Long id,
        String title,
        String content,
        String type,
        Boolean isRead,
        String createdBy,
        LocalDateTime createdAt,
        List<NotificationAttachmentResponse> attachments) {
}
