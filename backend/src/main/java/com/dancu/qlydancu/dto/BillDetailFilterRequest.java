package com.dancu.qlydancu.dto;

import com.dancu.qlydancu.model.enums.BillDetailStatus;

public class BillDetailFilterRequest {
    private String apartmentCode;
    private Integer month;
    private Integer year;
    private BillDetailStatus status;

    public String getApartmentCode() { return apartmentCode; }
    public void setApartmentCode(String apartmentCode) { this.apartmentCode = apartmentCode; }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public BillDetailStatus getStatus() {
        return status;
    }

    public void setStatus(BillDetailStatus status) {
        this.status = status;
    }
}