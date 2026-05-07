package com.dancu.qlydancu.model;

import com.dancu.qlydancu.model.enums.VehicleStatus;
import com.dancu.qlydancu.model.enums.VehicleType;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id")
    private Household household;

    @Column(name = "license_plate")
    private String licensePlate;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private VehicleType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private VehicleStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "file_url", length = 512)
    private String fileUrl;

    @Column(name = "file_created_at")
    private LocalDateTime fileCreatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Household getHousehold() { return household; }
    public void setHousehold(Household household) { this.household = household; }
    public String getLicensePlate() { return licensePlate; }
    public void setLicensePlate(String licensePlate) { this.licensePlate = licensePlate; }
    public VehicleType getType() { return type; }
    public void setType(VehicleType type) { this.type = type; }
    public VehicleStatus getStatus() { return status; }
    public void setStatus(VehicleStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public LocalDateTime getFileCreatedAt() { return fileCreatedAt; }
    public void setFileCreatedAt(LocalDateTime fileCreatedAt) { this.fileCreatedAt = fileCreatedAt; }
}