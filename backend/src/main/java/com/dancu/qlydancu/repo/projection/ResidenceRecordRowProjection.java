package com.dancu.qlydancu.repo.projection;

import java.time.LocalDate;

public interface ResidenceRecordRowProjection {
    Long getId();
    Long getRecordCode();
    Long getResidentId();
    String getResidentName();
    String getSubmittedByName();
    String getRelatedPersonName();
    String getCccd();
    String getBuildingCode();
    String getBuildingName();
    String getApartmentCode();
    Integer getFloorNumber();
    Integer getRoomNumber();
    String getHeadOfHouseholdName();
    String getType();
    String getStatus();
    String getReason();
    String getGuestName();
    String getGuestCccd();
    String getGuestPhone();
    String getGuestRelationship();
    LocalDate getStartDate();
    LocalDate getEndDate();
}
