package com.dancu.qlydancu.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import com.dancu.qlydancu.model.enums.PaymentMethod;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    @JsonIgnore
    private Bill bill;

    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    public Payment() {}

    public Payment(Long amount, LocalDate date) {
        this.amount = amount;
        this.paidAt = date != null ? date.atStartOfDay() : null;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBillId() { return bill != null ? bill.getId() : null; }

    public void setBillId(Long billId) {
        if (billId == null) {
            this.bill = null;
            return;
        }

        if (this.bill == null) {
            this.bill = new Bill();
        }
        this.bill.setId(billId);
    }

    public Bill getBill() { return bill; }
    public void setBill(Bill bill) { this.bill = bill; }

    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}
