package com.dancu.qlydancu.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

public class BillDetailUpdateRequest {
    private Long id; 
    private Long feeTypeId;
    private Long amount;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    private LocalDateTime dueDate;
    private String note;
    private String billingMonth;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getFeeTypeId() { return feeTypeId; }
    public void setFeeTypeId(Long feeTypeId) { this.feeTypeId = feeTypeId; }
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getBillingMonth() { return billingMonth; }
    public void setBillingMonth(String billingMonth) { this.billingMonth = billingMonth; }
}
