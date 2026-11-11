package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminBillFullResponse(
    Long id,
    String apartmentCode,
    String ownerName,
    String ownerPhone,
    String billingMonth,
    LocalDateTime createdAt,
    LocalDateTime dueDate,
    Long totalAmount,
    String status,
    List<AdminBillDetailInfo> details,
    LocalDateTime paidAt,
    String paymentMethod,
    String transactionCode,
    String confirmedBy,
    String issuanceStatus,
    LocalDateTime issuedAt,
    String issuedBy,
    Long version,
    List<String> publicationBlockers,
    Long paidAmount,
    Long outstanding,
    List<MeterChargeInfo> meterReadings
) {}
