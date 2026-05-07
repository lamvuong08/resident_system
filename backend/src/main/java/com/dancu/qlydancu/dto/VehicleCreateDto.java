package com.dancu.qlydancu.dto;

import com.dancu.qlydancu.model.enums.VehicleType;

public class VehicleCreateDto {
    private String licensePlate;
    private VehicleType type;

    public VehicleCreateDto() {
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public void setLicensePlate(String licensePlate) {
        this.licensePlate = licensePlate;
    }

    public VehicleType getType() {
        return type;
    }

    public void setType(VehicleType type) {
        this.type = type;
    }
}
