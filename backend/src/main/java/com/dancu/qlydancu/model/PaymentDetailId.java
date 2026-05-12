package com.dancu.qlydancu.model;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class PaymentDetailId implements Serializable {

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(name = "bill_detail_id")
    private Long billDetailId;

    public PaymentDetailId() {}

    public PaymentDetailId(Long paymentId, Long billDetailId) {
        this.paymentId = paymentId;
        this.billDetailId = billDetailId;
    }

    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }

    public Long getBillDetailId() { return billDetailId; }
    public void setBillDetailId(Long billDetailId) { this.billDetailId = billDetailId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PaymentDetailId that = (PaymentDetailId) o;
        return Objects.equals(paymentId, that.paymentId) &&
               Objects.equals(billDetailId, that.billDetailId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(paymentId, billDetailId);
    }
}