package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

public record AdminAggregatedBillResponse(
    Long id,
    String apartmentCode,
    String ownerName,
    String billingMonth,
    Long totalAmount,
    LocalDateTime dueDate,
    String status,
    String issuanceStatus,
    LocalDateTime issuedAt
) {
    public AdminAggregatedBillResponse(Long id,String apartmentCode,String ownerName,String billingMonth,Long totalAmount,LocalDateTime dueDate,String status) {
        this(id,apartmentCode,ownerName,billingMonth,totalAmount,dueDate,status,null,null);
    }
}
