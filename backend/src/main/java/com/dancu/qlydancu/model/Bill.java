package com.dancu.qlydancu.model;

import java.time.LocalDateTime;

import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "bills", uniqueConstraints=@jakarta.persistence.UniqueConstraint(name="uk_bill_apartment_period",columnNames={"apartment_id","period_key"}))
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Bill {
    @Column(name="period_key",length=7,nullable=false)
    private String periodKey;
    @jakarta.persistence.Version
    private Long version;
    @Column(name="issued_by")
    private String issuedBy;
    @Column(name="legacy_issued",nullable=false)
    private boolean legacyIssued;
    public boolean isLegacyIssued() { return legacyIssued; }
    public void setLegacyIssued(boolean value) { legacyIssued=value; }
    public String getPeriodKey() { return periodKey; }
    public void setPeriodKey(String value) { periodKey=value; }
    public Long getVersion() { return version; }
    public void setVersion(Long value) { version=value; }
    public String getIssuedBy() { return issuedBy; }
    public void setIssuedBy(String value) { issuedBy=value; }
    public boolean isDraft() { return !legacyIssued && issuedAt==null && status!=BillDetailStatus.PAID; }
    public String getIssuanceStatus() { return isDraft()?"DRAFT":"ISSUED"; }
    @jakarta.persistence.PrePersist
    @jakarta.persistence.PreUpdate
    private void canonicalPeriod() {
        if(billingMonth==null)throw new IllegalArgumentException("Thiếu kỳ hóa đơn");
        var format=billingMonth.contains("/")?java.time.format.DateTimeFormatter.ofPattern("MM/uuuu"):java.time.format.DateTimeFormatter.ofPattern("uuuu-MM");
        periodKey=java.time.YearMonth.parse(billingMonth,format).toString();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id")
    @JsonIgnore
    private Apartment apartment;

    @Column(name = "billing_month")
    private String billingMonth;

    @Column(name = "total_amount")
    private Long totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private BillDetailStatus status = BillDetailStatus.UNPAID;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "issued_at")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LOCAL_DATE_TIME)
    private LocalDateTime issuedAt;

    @Column(name = "payment_confirmed_at")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LOCAL_DATE_TIME)
    private LocalDateTime paymentConfirmedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Apartment getApartment() { return apartment; }
    public void setApartment(Apartment apartment) { this.apartment = apartment; }
    
    public String getBillingMonth() { return billingMonth; }
    public void setBillingMonth(String billingMonth) { this.billingMonth = billingMonth; }
    
    public Long getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Long totalAmount) { this.totalAmount = totalAmount; }
    
    public BillDetailStatus getStatus() { return status; }
    public void setStatus(BillDetailStatus status) { this.status = status; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }
    public LocalDateTime getPaymentConfirmedAt() { return paymentConfirmedAt; }
    public void setPaymentConfirmedAt(LocalDateTime paymentConfirmedAt) { this.paymentConfirmedAt = paymentConfirmedAt; }
}
