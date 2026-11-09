package com.dancu.qlydancu.billing;

public enum UtilityServiceType {
    ELECTRIC("điện"), WATER("nước");
    public final String label;
    UtilityServiceType(String label) { this.label=label; }
}
