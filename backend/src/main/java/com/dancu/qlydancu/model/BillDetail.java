package com.dancu.qlydancu.model;

import java.time.LocalDateTime;

import com.dancu.qlydancu.model.enums.BillDetailStatus;

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
@Table(name = "bill_details",uniqueConstraints=@jakarta.persistence.UniqueConstraint(name="uk_bill_fee",columnNames={"bill_id","fee_type_id"}))
public class BillDetail {
    @Column(name="meter_reading_id",unique=true)
    private Long meterReadingId;
    public Long getMeterReadingId() { return meterReadingId; }
    public void setMeterReadingId(Long value) { meterReadingId=value; }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    private Bill bill;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fee_type_id")
    private FeeType feeType;

    @Column(name = "quantity")
    private java.math.BigDecimal quantity;

    @Column(name = "unit_price")
    private Long unitPrice;

    @Column(name = "amount")
    private Long amount;

    @Column(name = "old_reading")
    private java.math.BigDecimal oldReading;

    @Column(name = "new_reading")
    private java.math.BigDecimal newReading;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private BillDetailStatus status = BillDetailStatus.UNPAID;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    public BillDetailStatus getStatus() { return status; }
    public void setStatus(BillDetailStatus status) { this.status = status; }

    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Bill getBill() { return bill; }
    public void setBill(Bill bill) { this.bill = bill; }
    public FeeType getFeeType() { return feeType; }
    public void setFeeType(FeeType feeType) { this.feeType = feeType; }
    public java.math.BigDecimal getQuantity() { return quantity; }
    public void setQuantity(java.math.BigDecimal quantity) { this.quantity = quantity; }
    public Long getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Long unitPrice) { this.unitPrice = unitPrice; }
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }

    public java.math.BigDecimal getOldReading() { return oldReading; }
    public void setOldReading(java.math.BigDecimal oldReading) { this.oldReading = oldReading; }

    public java.math.BigDecimal getNewReading() { return newReading; }
    public void setNewReading(java.math.BigDecimal newReading) { this.newReading = newReading; }
}
