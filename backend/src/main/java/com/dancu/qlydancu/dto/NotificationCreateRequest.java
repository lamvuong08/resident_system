package com.dancu.qlydancu.dto;

import java.util.List;

public record NotificationCreateRequest(
    String title,
    String content,
    com.dancu.qlydancu.model.enums.NotificationType type,
    String targetType, 
    List<Long> targetIds, 
    Integer floorNumber
) {}