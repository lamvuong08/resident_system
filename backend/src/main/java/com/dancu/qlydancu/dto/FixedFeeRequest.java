package com.dancu.qlydancu.dto;

public class FixedFeeRequest {
    private Long apartmentId;
    private Long feeTypeId;
    private String billingMonth; 
    private Long amount;
    private String dueDate; 
    private String note;
    private java.math.BigDecimal oldReading;
    private java.math.BigDecimal newReading;
    private Long unitPrice;

    public Long getApartmentId() {
        return apartmentId;
    }

    public void setApartmentId(Long apartmentId) {
        this.apartmentId = apartmentId;
    }

    public Long getFeeTypeId() {
        return feeTypeId;
    }

    public void setFeeTypeId(Long feeTypeId) {
        this.feeTypeId = feeTypeId;
    }

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public java.math.BigDecimal getOldReading() { return oldReading; }
    public void setOldReading(java.math.BigDecimal oldReading) { this.oldReading = oldReading; }

    public java.math.BigDecimal getNewReading() { return newReading; }
    public void setNewReading(java.math.BigDecimal newReading) { this.newReading = newReading; }

    public Long getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Long unitPrice) { this.unitPrice = unitPrice; }
}