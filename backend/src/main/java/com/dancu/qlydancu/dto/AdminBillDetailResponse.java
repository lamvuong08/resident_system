package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

import com.dancu.qlydancu.model.enums.BillDetailStatus;

public record AdminBillDetailResponse(
    Long detailId,
    String apartmentCode,
    String billingMonth,
    String feeTypeName,
    Long amount,
    BillDetailStatus status,
    Long billId,
    LocalDateTime createdAt,
    LocalDateTime dueDate
) {}