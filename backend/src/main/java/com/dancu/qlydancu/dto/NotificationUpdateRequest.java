package com.dancu.qlydancu.dto;

import com.dancu.qlydancu.model.enums.NotificationType;

public record NotificationUpdateRequest(
    String title,
    String content,
    NotificationType type
) {}