package com.dancu.qlydancu.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "meter_tariffs")
public class MeterTariff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meter_type_id", nullable = false)
    private MeterType meterType;

    @Column(name = "min_usage")
    private Integer minUsage; // Mức tiêu thụ tối thiểu của bậc này

    @Column(name = "max_usage")
    private Integer maxUsage; // Mức tiêu thụ tối đa của bậc này (có thể null nếu là bậc cuối cùng)

    @Column(name = "unit_price", nullable = false)
    private Long unitPrice; // Đơn giá cho bậc này

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MeterType getMeterType() {
        return meterType;
    }

    public void setMeterType(MeterType meterType) {
        this.meterType = meterType;
    }

    public Integer getMinUsage() {
        return minUsage;
    }

    public void setMinUsage(Integer minUsage) {
        this.minUsage = minUsage;
    }

    public Integer getMaxUsage() {
        return maxUsage;
    }

    public void setMaxUsage(Integer maxUsage) {
        this.maxUsage = maxUsage;
    }

    public Long getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Long unitPrice) {
        this.unitPrice = unitPrice;
    }
}