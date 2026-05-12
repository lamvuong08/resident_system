package com.dancu.qlydancu.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.model.enums.PaymentMethod;
import com.dancu.qlydancu.model.enums.PaymentStatus;

public class PaymentResponseDTO {
    private Long id;
    
    // Đã thay thế billId bằng danh sách các chi tiết phí (Giỏ hàng)
    private List<Long> billDetailIds; 
    
    private Long amount;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String transactionCode;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    // Factory method để map từ Entity sang DTO
    public static PaymentResponseDTO fromEntity(Payment payment) {
        if (payment == null) return null;
        
        PaymentResponseDTO dto = new PaymentResponseDTO();
        dto.setId(payment.getId());
        
        // Lấy danh sách ID của các khoản phí nằm trong giao dịch này
        if (payment.getPaymentDetails() != null) {
            List<Long> detailIds = payment.getPaymentDetails().stream()
                    .map(pd -> pd.getBillDetail().getId())
                    .collect(Collectors.toList());
            dto.setBillDetailIds(detailIds);
        }
        
        dto.setAmount(payment.getAmount());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setStatus(payment.getStatus());
        dto.setTransactionCode(payment.getTransactionCode());
        dto.setPaidAt(payment.getPaidAt());
        dto.setPaidAt(payment.getPaidAt());
        return dto;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public List<Long> getBillDetailIds() { return billDetailIds; }
    public void setBillDetailIds(List<Long> billDetailIds) { this.billDetailIds = billDetailIds; }
    
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
    
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    
    public String getTransactionCode() { return transactionCode; }
    public void setTransactionCode(String transactionCode) { this.transactionCode = transactionCode; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}