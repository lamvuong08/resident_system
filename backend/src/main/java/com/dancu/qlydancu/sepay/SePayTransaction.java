package com.dancu.qlydancu.sepay;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name="sepay_transactions")
@Getter @Setter
public class SePayTransaction {
    @Id @Column(length=80) private String transactionKey;
    @Column(unique=true, length=350) private String referenceKey;
    @Lob @Column(columnDefinition="LONGTEXT",nullable=false) private String rawPayload;
    @Column(nullable=false,length=40) private String outcome;
    private Long billId;
    private Long paymentId;
    private LocalDateTime receivedAt;
}
