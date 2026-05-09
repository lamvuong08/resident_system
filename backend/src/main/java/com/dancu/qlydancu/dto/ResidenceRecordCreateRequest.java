package com.dancu.qlydancu.dto;

import java.time.LocalDate;

public class ResidenceRecordCreateRequest {
    public String type;
    public Long residentId;
    public Long householdId;
    public String guestName;
    public String guestCccd;
    public String guestPhone;
    public String guestRelationship;
    public String reason;
    public LocalDate startDate;
    public LocalDate endDate;
}