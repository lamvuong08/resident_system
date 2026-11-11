package com.dancu.qlydancu.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.*;
public record InvoiceIssueRequest(@NotNull LocalDate dueDate,@NotNull @PositiveOrZero Long version) {}
