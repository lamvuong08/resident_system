package com.dancu.qlydancu.dto;

import com.dancu.qlydancu.model.enums.PaymentMethod;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class PaymentRequestDTO {
    
    @NotNull(message = "ID Hóa đơn không được để trống")
    private Long billId;
    
    @NotNull(message = "Phương thức thanh toán không hợp lệ")
    private PaymentMethod paymentMethod; // MOMO, ZALOPAY, BANK
    
    @NotBlank(message = "Mã giao dịch không được để trống")
    private String transactionCode; 
    
    @NotNull(message = "Số tiền không được để trống")
    @Positive(message = "Số tiền phải lớn hơn 0")
    private Long amount;

    // Getters and Setters
    public Long getBillId() { return billId; }
    public void setBillId(Long billId) { this.billId = billId; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getTransactionCode() { return transactionCode; }
    public void setTransactionCode(String transactionCode) { this.transactionCode = transactionCode; }

    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
}