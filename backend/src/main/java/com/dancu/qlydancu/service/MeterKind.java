package com.dancu.qlydancu.service;

import com.dancu.qlydancu.model.MeterType;
import com.dancu.qlydancu.model.enums.FeeTypeCode;
import java.util.Locale;

public enum MeterKind {
    ELECTRICITY("điện", "kWh", FeeTypeCode.ELECTRIC),
    WATER("nước", "m³", FeeTypeCode.WATER);

    public final String label;
    public final String unit;
    public final FeeTypeCode feeCode;
    MeterKind(String label, String unit, FeeTypeCode feeCode) {
        this.label = label; this.unit = unit; this.feeCode = feeCode;
    }
    public boolean matches(MeterType meter) {
        if (meter.getCode() != null && !meter.getCode().isBlank()) return feeCode.name().equalsIgnoreCase(meter.getCode());
        String unit = meter.getUnit() == null ? "" : meter.getUnit().trim();
        String name = meter.getName() == null ? "" : meter.getName().toLowerCase(Locale.ROOT);
        return this == WATER ? unit.equalsIgnoreCase("m3") || unit.equalsIgnoreCase("m³") || name.contains("nước")
            : unit.equalsIgnoreCase("kwh") || name.contains("điện");
    }
    public static MeterKind of(MeterType meter) {
        for (var kind : values()) if (kind.matches(meter)) return kind;
        throw new IllegalArgumentException("Loại đồng hồ không hỗ trợ");
    }
}
