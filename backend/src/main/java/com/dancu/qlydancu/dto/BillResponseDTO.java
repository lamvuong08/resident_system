package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;
import java.util.Map;

import com.dancu.qlydancu.model.enums.BillStatus;

public record BillResponseDTO(
                Long id,
                String billingMonth,
                Long totalAmount,
                BillStatus status,
                LocalDateTime createdAt,
                Map<String, Long> details // Key: Tên loại phí (Điện, Nước...), Value: Số tiền
) {
}