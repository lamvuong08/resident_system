package com.dancu.qlydancu.model;

import jakarta.persistence.*;

@Entity
@Table(name = "apartment_finances")
public class ApartmentFinance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String item;

    private Long amount;

    @Column(name = "billing_month", nullable = false)
    private String billingMonth; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id")
    private Apartment apartment;

    public ApartmentFinance() {}

    public ApartmentFinance(String item, Long amount, String billingMonth) {
        this.item = item;
        this.amount = amount;
        this.billingMonth = billingMonth;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getItem() {
        return item;
    }

    public void setItem(String item) {
        this.item = item;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }

    public Apartment getApartment() {
        return apartment;
    }

    public void setApartment(Apartment apartment) {
        this.apartment = apartment;
    }
}