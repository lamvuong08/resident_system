package com.dancu.qlydancu.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity @Table(name="meter_reading_audit") @Getter @Setter
public class MeterReadingAudit {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="reading_id",nullable=false) private Long readingId;
    @Column(nullable=false) private String action;
    @Column(nullable=false) private String actor;
    @Column(length=1000) private String reason;
    private BigDecimal oldReading;
    private BigDecimal newReading;
    private Long estimatedAmount;
    @Column(columnDefinition="TEXT") private String tariffSnapshot;
    private Long readingVersion;
    private Long billDetailId;
    @Column(nullable=false) private LocalDateTime createdAt;
}
