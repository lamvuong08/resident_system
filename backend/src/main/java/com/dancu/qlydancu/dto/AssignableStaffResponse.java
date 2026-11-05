package com.dancu.qlydancu.dto;

public record AssignableStaffResponse(Long id, String name, long unfinishedCount, long assignedCount, long processingCount) {}
