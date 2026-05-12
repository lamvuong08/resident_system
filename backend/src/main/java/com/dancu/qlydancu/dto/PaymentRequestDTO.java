package com.dancu.qlydancu.dto;

import java.util.List;

import com.dancu.qlydancu.model.enums.PaymentMethod;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public class PaymentRequestDTO {

    @NotEmpty(message = "Danh sách khoản phí không được để trống")
    private List<Long> billDetailIds;

    @NotNull(message = "Phương thức thanh toán không hợp lệ")
    private PaymentMethod paymentMethod;

    private String transactionCode;

    // Getters and Setters
    public List<Long> getBillDetailIds() { return billDetailIds; }
    public void setBillDetailIds(List<Long> billDetailIds) { this.billDetailIds = billDetailIds; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getTransactionCode() { return transactionCode; }
    public void setTransactionCode(String transactionCode) { this.transactionCode = transactionCode; }
}