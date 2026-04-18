package com.dancu.qlydancu.model;

import com.dancu.qlydancu.model.enums.FeeTypeCode;
import jakarta.persistence.*;

@Entity
@Table(name = "fee_types")
public class FeeType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "code")
    private FeeTypeCode code;

    private String name;

    @Column(name = "default_amount")
    private Long defaultAmount;

    @Column(name = "is_metered")
    private Boolean isMetered;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public FeeTypeCode getCode() { return code; }
    public void setCode(FeeTypeCode code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getDefaultAmount() { return defaultAmount; }
    public void setDefaultAmount(Long defaultAmount) { this.defaultAmount = defaultAmount; }
    public Boolean getIsMetered() { return isMetered; }
    public void setIsMetered(Boolean metered) { isMetered = metered; }
}