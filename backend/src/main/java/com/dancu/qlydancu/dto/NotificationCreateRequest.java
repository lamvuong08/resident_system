package com.dancu.qlydancu.dto;

import java.util.List;

public record NotificationCreateRequest(
    String title,
    String content,
    com.dancu.qlydancu.model.enums.NotificationType type,
    String targetType, // ALL, BUILDING, FLOOR, APARTMENT
    List<Long> targetIds, // Chứa ID của Tòa nhà hoặc các Căn hộ cụ thể
    Integer floorNumber // Thêm trường này để xử lý chọn theo Tầng
) {}