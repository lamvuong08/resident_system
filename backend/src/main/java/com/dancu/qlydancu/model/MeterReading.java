package com.dancu.qlydancu.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "meter_readings")
public class MeterReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meter_type_id", nullable = false)
    private MeterType meterType;

    @Column(name = "billing_month", nullable = false)
    private String billingMonth; // Định dạng "MM/YYYY" hoặc "YYYY-MM"

    @Column(name = "old_reading", nullable = false)
    private java.math.BigDecimal oldReading;

    @Column(name = "new_reading", nullable = false)
    private java.math.BigDecimal newReading;

    @Column(name = "usage_amount", nullable = false)
    private java.math.BigDecimal usageAmount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Apartment getApartment() {
        return apartment;
    }

    public void setApartment(Apartment apartment) {
        this.apartment = apartment;
    }

    public MeterType getMeterType() {
        return meterType;
    }

    public void setMeterType(MeterType meterType) {
        this.meterType = meterType;
    }

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }

    public java.math.BigDecimal getOldReading() {
        return oldReading;
    }

    public void setOldReading(java.math.BigDecimal oldReading) {
        this.oldReading = oldReading;
    }

    public java.math.BigDecimal getNewReading() {
        return newReading;
    }

    public void setNewReading(java.math.BigDecimal newReading) {
        this.newReading = newReading;
    }

    public java.math.BigDecimal getUsageAmount() {
        return usageAmount;
    }

    public void setUsageAmount(java.math.BigDecimal usageAmount) {
        this.usageAmount = usageAmount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}