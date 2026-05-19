package com.dancu.qlydancu.dto;

public record AdminBillDetailInfo(
    Long id,
    String feeName,
    Long amount,
    String note,
    java.math.BigDecimal oldReading,
    java.math.BigDecimal newReading,
    Long unitPrice,
    java.math.BigDecimal quantity
) {}
