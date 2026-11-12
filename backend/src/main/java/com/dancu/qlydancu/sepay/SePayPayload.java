package com.dancu.qlydancu.sepay;

import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown=true)
public record SePayPayload(Long id, String gateway, String transactionDate, String accountNumber,
        String subAccount, String code, String content, String transferType, String description,
        BigDecimal transferAmount, BigDecimal accumulated, String referenceCode) {}
