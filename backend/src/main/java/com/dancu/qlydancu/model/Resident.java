package com.dancu.qlydancu.model;

import jakarta.persistence.*;
import com.dancu.qlydancu.model.enums.Gender;
import com.dancu.qlydancu.model.enums.OccupancyStatus;
import com.dancu.qlydancu.model.enums.ResidentCategory;
import com.dancu.qlydancu.model.enums.ResidentRelationship;

import java.time.LocalDate;
import java.time.Period;
import java.time.LocalDateTime;

@Entity
@Table(name = "residents")
public class Resident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name")
    private String name;

    @Column(name = "dob")
    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender;

    @Column(name = "cccd", unique = true)
    private String cccd;

    @Column(name = "phone")
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship")
    private ResidentRelationship relationship;

    @Enumerated(EnumType.STRING)
    @Column(name = "resident_category")
    private ResidentCategory residentCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "occupancy_status")
    private OccupancyStatus occupancyStatus;

    @Column(name = "household_id", nullable = false)
    private Long householdId;

    @Column(name = "user_id")
    private Long userId;


    @Transient
    private LocalDateTime createdAt;

    @Transient
    private Apartment apartment;

    public Resident() {}

    public Resident(String name) {
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getAge() {
        if (dob == null) {
            return null;
        }
        return Period.between(dob, LocalDate.now()).getYears();
    }

    public void setAge(Integer age) {
        if (age == null) {
            this.dob = null;
            return;
        }
        this.dob = LocalDate.now().minusYears(age);
    }

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public String getCccd() {
        return cccd;
    }

    public void setCccd(String cccd) {
        this.cccd = cccd;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public ResidentRelationship getRelationship() {
        return relationship;
    }

    public void setRelationship(ResidentRelationship relationship) {
        this.relationship = relationship;
    }

    public ResidentCategory getResidentCategory() {
        return residentCategory;
    }

    public void setResidentCategory(ResidentCategory residentCategory) {
        this.residentCategory = residentCategory;
    }

    public OccupancyStatus getOccupancyStatus() {
        return occupancyStatus;
    }

    public void setOccupancyStatus(OccupancyStatus occupancyStatus) {
        this.occupancyStatus = occupancyStatus;
    }

    @Transient
    public String getStatus() {
        return occupancyStatus != null ? occupancyStatus.name() : null;
    }

    public void setStatus(String status) {
        if (status == null || status.isBlank()) {
            this.occupancyStatus = null;
            return;
        }

        String normalized = status.trim().toUpperCase();
        if ("ACTIVE".equals(normalized)) {
            this.occupancyStatus = OccupancyStatus.LIVING;
            return;
        }
        if ("TEMPORARY_ABSENCE".equals(normalized)) {
            this.occupancyStatus = OccupancyStatus.TEMP_ABSENT;
            return;
        }
        if ("MOVED_OUT".equals(normalized)) {
            this.occupancyStatus = OccupancyStatus.EXPIRED;
            return;
        }
        if ("TEMPORARY_STAY".equals(normalized)) {
            this.occupancyStatus = OccupancyStatus.LIVING;
            this.residentCategory = ResidentCategory.TEMPORARY;
            return;
        }

        this.occupancyStatus = OccupancyStatus.valueOf(normalized);
    }

    public Long getHouseholdId() {
        return householdId;
    }

    public void setHouseholdId(Long householdId) {
        this.householdId = householdId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Apartment getApartment() {
        return apartment;
    }

    public void setApartment(Apartment apartment) {
        this.apartment = apartment;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
