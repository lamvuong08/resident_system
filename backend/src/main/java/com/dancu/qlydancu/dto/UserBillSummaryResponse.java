package com.dancu.qlydancu.dto;

import java.util.List;

public record UserBillSummaryResponse(
        long paidCount, // Số hóa đơn xanh
        long unpaidCount, // Số hóa đơn đỏ (Gồm UNPAID và PENDING)
        List<BillResponseDTO> bills) {
}