package com.dancu.qlydancu.service;

import com.dancu.qlydancu.model.MeterType;
import com.dancu.qlydancu.repo.MeterTypeRepository;
import java.time.YearMonth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MeteringPolicy {
    private final MeterTypeRepository meters;
    private final YearMonth waterStart;
    public MeteringPolicy(MeterTypeRepository meters,
            @Value("${water-meter.start-period:2026-11}") String waterStart) {
        this.meters = meters;
        this.waterStart = ElectricityCalculation.period(waterStart);
    }
    public boolean meteredWater(String period) {
        return !ElectricityCalculation.period(period).isBefore(waterStart);
    }
    public void validatePeriod(MeterType meter, String period) {
        if (MeterKind.of(meter) == MeterKind.WATER && !meteredWater(period))
            throw new IllegalArgumentException("Kỳ này còn áp dụng phí nước cố định; chỉ ghi nước từ " + waterStart);
    }
    public MeterType resolve(Long id, MeterKind requested) {
        // Missing fields preserve the existing electricity API contract.
        if (id != null) {
            var meter = meters.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy loại đồng hồ"));
            var kind = MeterKind.of(meter);
            if (requested != null && requested != kind) throw new IllegalArgumentException("Loại đồng hồ không khớp dịch vụ");
            return meter;
        }
        var kind = requested == null ? MeterKind.ELECTRICITY : requested;
        var found = meters.findAll().stream().filter(kind::matches).toList();
        if (found.size() != 1) throw new IllegalArgumentException("Cần cấu hình duy nhất một loại đồng hồ " + kind.label);
        return found.getFirst();
    }
}
