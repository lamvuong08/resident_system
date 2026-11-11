package com.dancu.qlydancu.service;

import com.dancu.qlydancu.model.MeterTariff;
import com.dancu.qlydancu.model.MeterType;
import com.dancu.qlydancu.repo.MeterTariffRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MeterPricingService {
    private final MeterTariffRepository tariffs;
    private final MeteringPolicy policy;
    public MeterPricingService(MeterTariffRepository tariffs, MeteringPolicy policy) {
        this.tariffs = tariffs; this.policy = policy;
    }
    public List<MeterTariff> prices(MeterType meter, String period) {
        policy.validatePeriod(meter, period);
        var all = tariffs.findByMeterTypeIdOrderByMinUsageAsc(meter.getId());
        if (MeterKind.of(meter) == MeterKind.ELECTRICITY) return all;
        LocalDate date = ElectricityCalculation.period(period).atDay(1);
        // A monthly schedule is selected by the first day of the billing period.
        var selected = all.stream().filter(t -> t.getEffectiveFrom() != null && !date.isBefore(t.getEffectiveFrom())
            && (t.getEffectiveTo() == null || !date.isAfter(t.getEffectiveTo()))).toList();
        if (selected.isEmpty()) throw new IllegalArgumentException("Chưa cấu hình biểu giá nước có hiệu lực trong kỳ " + period);
        var first = selected.getFirst();
        if (first.getEffectiveFrom().getDayOfMonth() != 1 || first.getEffectiveTo() != null
                && first.getEffectiveTo().getDayOfMonth() != first.getEffectiveTo().lengthOfMonth())
            throw new IllegalArgumentException("Biểu giá nước phải có hiệu lực trọn kỳ tháng");
        if (selected.stream().anyMatch(t -> !java.util.Objects.equals(t.getEffectiveFrom(), first.getEffectiveFrom())
                || !java.util.Objects.equals(t.getEffectiveTo(), first.getEffectiveTo())))
            throw new IllegalArgumentException("Các biểu giá nước có thời gian hiệu lực chồng lấn");
        ElectricityCalculation.amount(BigDecimal.ZERO, selected); // validates every tier, even for zero usage
        if (selected.getLast().getMaxUsage() != null)
            throw new IllegalArgumentException("Bậc nước cuối cùng phải bao phủ lượng dùng không giới hạn");
        return selected;
    }
    public long amount(BigDecimal usage, List<MeterTariff> prices) {
        return ElectricityCalculation.amount(usage, prices);
    }
    public String snapshot(MeterType meter, List<MeterTariff> prices) {
        String tiers = ElectricityCalculation.snapshot(prices);
        if (MeterKind.of(meter) == MeterKind.ELECTRICITY) return tiers;
        var first = prices.getFirst();
        return "Hiệu lực " + first.getEffectiveFrom() + " → " + (first.getEffectiveTo() == null ? "không giới hạn" : first.getEffectiveTo())
            + "; " + tiers.replace("đ/kWh", "đ/m³");
    }
}
