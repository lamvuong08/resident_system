package com.dancu.qlydancu.repo.projection;

import java.time.LocalDate;

public interface ResidentAdminRowProjection {
    Long getId();
    String getFullName();
    LocalDate getDob();
    String getCccd();
    String getPhone();
    String getRelationship();
    String getResidentCategory();
    String getOccupancyStatus();
    Long getHouseholdId();
    String getApartmentCode();
    String getBuildingCode();
}
