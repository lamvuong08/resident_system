package com.dancu.qlydancu.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@lombok.Getter @lombok.Setter
public class ApartmentMeterReadingResponse {
    private Long linkedBillId;
    private String linkedBillStatus;
    private Long readingId;
    private Long version;
    private String approvalStatus;
    private String recordedBy;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String rejectionReason;
    private String tariffSnapshot;
    private Long issuedBillDetailId;
    private boolean eligibleForIssue;
    private String issueBlockedReason;
    private Long apartmentId;
    private String apartmentCode;
    private Long buildingId;
    private String buildingCode;
    private String buildingName;
    private Integer floorNumber;
    private String ownerName;
    private Long meterTypeId;
    private String meterTypeName;
    private String billingMonth;
    private BigDecimal oldReading;
    private BigDecimal newReading;
    private BigDecimal usageAmount;
    private Long calculatedAmount;
    private String recordedStatus; // "RECORDED", "NOT_RECORDED"
    private String billStatus;     // "UNPAID", "PAID", null
    private Boolean isLocked;      // true if bill is PAID
    private LocalDateTime recordedAt;

    public ApartmentMeterReadingResponse() {}

    public Long getApartmentId() { return apartmentId; }
    public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }

    public String getApartmentCode() { return apartmentCode; }
    public void setApartmentCode(String apartmentCode) { this.apartmentCode = apartmentCode; }

    public Long getBuildingId() { return buildingId; }
    public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

    public String getBuildingCode() { return buildingCode; }
    public void setBuildingCode(String buildingCode) { this.buildingCode = buildingCode; }

    public String getBuildingName() { return buildingName; }
    public void setBuildingName(String buildingName) { this.buildingName = buildingName; }

    public Integer getFloorNumber() { return floorNumber; }
    public void setFloorNumber(Integer floorNumber) { this.floorNumber = floorNumber; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public Long getMeterTypeId() { return meterTypeId; }
    public void setMeterTypeId(Long meterTypeId) { this.meterTypeId = meterTypeId; }

    public String getMeterTypeName() { return meterTypeName; }
    public void setMeterTypeName(String meterTypeName) { this.meterTypeName = meterTypeName; }

    public String getBillingMonth() { return billingMonth; }
    public void setBillingMonth(String billingMonth) { this.billingMonth = billingMonth; }

    public BigDecimal getOldReading() { return oldReading; }
    public void setOldReading(BigDecimal oldReading) { this.oldReading = oldReading; }

    public BigDecimal getNewReading() { return newReading; }
    public void setNewReading(BigDecimal newReading) { this.newReading = newReading; }

    public BigDecimal getUsageAmount() { return usageAmount; }
    public void setUsageAmount(BigDecimal usageAmount) { this.usageAmount = usageAmount; }

    public Long getCalculatedAmount() { return calculatedAmount; }
    public void setCalculatedAmount(Long calculatedAmount) { this.calculatedAmount = calculatedAmount; }

    public String getRecordedStatus() { return recordedStatus; }
    public void setRecordedStatus(String recordedStatus) { this.recordedStatus = recordedStatus; }

    public String getBillStatus() { return billStatus; }
    public void setBillStatus(String billStatus) { this.billStatus = billStatus; }

    public Boolean getIsLocked() { return isLocked; }
    public void setIsLocked(Boolean isLocked) { this.isLocked = isLocked; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }
}
