package com.dancu.qlydancu.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.dancu.qlydancu.model.enums.ResidenceRecordStatus;
import com.dancu.qlydancu.model.enums.ResidenceRecordType;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "residence_records")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ResidenceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resident_id")
    @JsonIgnore
    private Resident resident;

    @Column(name = "household_id", nullable = false)
    private Long householdId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private ResidenceRecordType type;

    @Column(name = "guest_name")
    private String guestName;

    @Column(name = "guest_cccd")
    private String guestCccd;

    @Column(name = "guest_phone")
    private String guestPhone;

    @Column(name = "reason")
    private String reason;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ResidenceRecordStatus status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Resident getResident() { return resident; }
    public void setResident(Resident resident) { this.resident = resident; }
    public Long getHouseholdId() { return householdId; }
    public void setHouseholdId(Long householdId) { this.householdId = householdId; }
    public ResidenceRecordType getType() { return type; }
    public void setType(ResidenceRecordType type) { this.type = type; }
    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }
    public String getGuestCccd() { return guestCccd; }
    public void setGuestCccd(String guestCccd) { this.guestCccd = guestCccd; }
    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public ResidenceRecordStatus getStatus() { return status; }
    public void setStatus(ResidenceRecordStatus status) { this.status = status; }
}