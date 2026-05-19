package com.dancu.qlydancu.dto;

import java.math.BigDecimal;

public class MeterReadingRequest {
    private Long apartmentId;
    private Long meterTypeId;
    private String billingMonth; // Định dạng "MM/YYYY" hoặc "YYYY-MM"
    private BigDecimal newReading;

    // Getters and Setters
    public Long getApartmentId() { return apartmentId; }
    public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }
    public Long getMeterTypeId() { return meterTypeId; }
    public void setMeterTypeId(Long meterTypeId) { this.meterTypeId = meterTypeId; }
    public String getBillingMonth() { return billingMonth; }
    public void setBillingMonth(String billingMonth) { this.billingMonth = billingMonth; }
    public BigDecimal getNewReading() { return newReading; }
    public void setNewReading(BigDecimal newReading) { this.newReading = newReading; }
}