package com.dancu.qlydancu.model;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

@Entity
@Table(name = "payment_details")
public class PaymentDetail {

    @EmbeddedId
    private PaymentDetailId id = new PaymentDetailId();

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("paymentId")
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("billDetailId")
    @JoinColumn(name = "bill_detail_id")
    private BillDetail billDetail;

    public PaymentDetail() {
    }

    public PaymentDetail(Payment payment, BillDetail billDetail) {
        this.payment = payment;
        this.billDetail = billDetail;
        this.id = new PaymentDetailId(payment.getId(), billDetail.getId());
    }

    public PaymentDetailId getId() {
        return id;
    }

    public void setId(PaymentDetailId id) {
        this.id = id;
    }

    public Payment getPayment() {
        return payment;
    }

    public void setPayment(Payment payment) {
        this.payment = payment;
    }

    public BillDetail getBillDetail() {
        return billDetail;
    }

    public void setBillDetail(BillDetail billDetail) {
        this.billDetail = billDetail;
    }
}