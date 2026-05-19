package com.dancu.qlydancu.dto;

public record BillStatisticsResponse(
    Long totalCollected,
    Long totalUnpaid,
    Long overdueCount,
    Long unpaidCount
) {}
