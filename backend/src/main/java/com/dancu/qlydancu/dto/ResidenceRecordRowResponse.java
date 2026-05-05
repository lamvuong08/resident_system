package com.dancu.qlydancu.dto;

import java.time.LocalDate;

public class ResidenceRecordRowResponse {
    public Long id;
    public Long recordCode;
    public Long residentId;
    public String residentName;
    public String submittedByName;
    public String relatedPersonName;
    public String cccd;
    public String buildingCode;
    public String buildingName;
    public String apartmentCode;
    public Integer floorNumber;
    public Integer roomNumber;
    public String headOfHouseholdName;
    public String type;
    public String status;
    public String reason;
    public String guestName;
    public String guestCccd;
    public String guestPhone;
    public String guestRelationship;
    public LocalDate startDate;
    public LocalDate endDate;
}
