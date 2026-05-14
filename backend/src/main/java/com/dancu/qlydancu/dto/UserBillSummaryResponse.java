package com.dancu.qlydancu.dto;

import java.util.List;

public record UserBillSummaryResponse(
        long paidCount, 
        long unpaidCount,
        List<BillResponseDTO> bills) {
}