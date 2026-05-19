package com.dancu.qlydancu.dto;

import java.util.List;

public record BulkBillRequest(
    List<Long> apartmentIds,
    Long feeTypeId,
    String billingMonth,
    Long amount,
    String dueDate 
) {}
