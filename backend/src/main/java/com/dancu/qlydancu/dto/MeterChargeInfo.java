package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;
import java.math.BigDecimal;
public record MeterChargeInfo(Long readingId,Long detailId,String feeCode,BigDecimal oldReading,BigDecimal newReading,
    BigDecimal usageAmount,Long amount,String tariffSnapshot,String recordedBy,LocalDateTime recordedAt,
    String approvedBy,LocalDateTime approvedAt) {}
