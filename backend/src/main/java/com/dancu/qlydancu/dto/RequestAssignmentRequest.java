package com.dancu.qlydancu.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record RequestAssignmentRequest(@NotNull @Positive Long staffId,
                                       @Size(max = 2000) String reason,
                                       @Positive Long expectedStaffId) {}
