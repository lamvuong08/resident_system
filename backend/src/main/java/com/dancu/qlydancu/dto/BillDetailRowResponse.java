package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

import com.dancu.qlydancu.model.enums.BillDetailStatus;

public record BillDetailRowResponse(
    Long detailId,
    String billingMonth,
    String feeTypeName,
    Long amount,
    BillDetailStatus status,
    Long billId,
    LocalDateTime createdAt,
    LocalDateTime dueDate,
    java.math.BigDecimal oldReading,
    java.math.BigDecimal newReading,
    Long unitPrice
) {}