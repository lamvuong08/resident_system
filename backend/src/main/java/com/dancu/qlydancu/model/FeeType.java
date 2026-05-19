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

    @Enumerated(EnumType.STRING)
    @Column(name = "calculation_type")
    private com.dancu.qlydancu.model.enums.CalculationType calculationType = com.dancu.qlydancu.model.enums.CalculationType.FIXED;

    @Column(name = "unit_price")
    private Long unitPrice;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public FeeTypeCode getCode() { return code; }
    public void setCode(FeeTypeCode code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getDefaultAmount() { return defaultAmount; }
    public void setDefaultAmount(Long defaultAmount) { this.defaultAmount = defaultAmount; }
    public Boolean getIsMetered() { return isMetered; }
    public void setIsMetered(Boolean metered) { 
        isMetered = metered;
        this.calculationType = (metered != null && metered) ? com.dancu.qlydancu.model.enums.CalculationType.ELECTRIC_METER : com.dancu.qlydancu.model.enums.CalculationType.FIXED;
    }
    public com.dancu.qlydancu.model.enums.CalculationType getCalculationType() { return calculationType; }
    public void setCalculationType(com.dancu.qlydancu.model.enums.CalculationType calculationType) { this.calculationType = calculationType; }
    public Long getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Long unitPrice) { this.unitPrice = unitPrice; }
}