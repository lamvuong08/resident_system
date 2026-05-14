package com.dancu.qlydancu.dto;

import java.math.BigDecimal;

import com.dancu.qlydancu.model.Apartment;

public class ApartmentResponse {
    public Long id;
    public String code;
    public Integer floorNumber;
    public Integer roomNumber;
    public BigDecimal area;
    public String status;
    public String ownerName;
    public Integer peopleCount;
    public String buildingCode;
    public String buildingName;
    public Long householdId;

    public ApartmentResponse(Apartment a) {
        this.id = a.getId();
        this.code = a.getCode();
        this.floorNumber = a.getFloorNumber();
        this.roomNumber = a.getRoomNumber();
        this.area = a.getArea();
        this.status = a.getStatus() != null ? a.getStatus().name() : null;

        this.ownerName = a.getOwnerName();
        this.peopleCount = a.getPeopleCount();

        if (a.getBuilding() != null) {
            this.buildingCode = a.getBuilding().getCode();
            this.buildingName = a.getBuilding().getName();
        }

        this.householdId = null; 
    }
}