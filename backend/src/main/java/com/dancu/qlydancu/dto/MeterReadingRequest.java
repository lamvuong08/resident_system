package com.dancu.qlydancu.dto;

import java.math.BigDecimal;

public class MeterReadingRequest {
    private com.dancu.qlydancu.service.MeterKind service;
    public com.dancu.qlydancu.service.MeterKind getService() { return service; }
    public void setService(com.dancu.qlydancu.service.MeterKind value) { service = value; }
    private Long apartmentId;
    private Long meterTypeId;
    private String billingMonth; // Định dạng "MM/YYYY" hoặc "YYYY-MM"
    private BigDecimal newReading;
    private Long expectedVersion;
    public Long getExpectedVersion() { return expectedVersion; }
    public void setExpectedVersion(Long expectedVersion) { this.expectedVersion=expectedVersion; }

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
