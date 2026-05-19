package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;

public record BillConfirmRequest(
    LocalDateTime paymentDate,
    String paymentMethod,
    String transactionCode,
    String note
) {}
