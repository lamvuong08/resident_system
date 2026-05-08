package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

import com.dancu.qlydancu.model.enums.BillStatus;

public record BillDetailRowResponse(
    Long detailId,
    String billingMonth,
    String feeTypeName,
    Long amount,
    BillStatus status,
    Long billId,
    LocalDateTime createdAt
) {}