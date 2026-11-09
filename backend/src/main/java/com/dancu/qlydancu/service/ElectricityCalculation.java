package com.dancu.qlydancu.service;

import com.dancu.qlydancu.model.MeterTariff;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

public final class ElectricityCalculation {
    private ElectricityCalculation() {}
    public static YearMonth period(String value) {
        if(value==null)throw new IllegalArgumentException("Vui lòng chọn kỳ điện");
        String text=value.trim();
        try {
            if(text.matches("\\d{2}/\\d{4}"))return YearMonth.parse(text,DateTimeFormatter.ofPattern("MM/uuuu"));
            if(text.matches("\\d{4}-\\d{2}"))return YearMonth.parse(text);
        } catch(java.time.DateTimeException ignored) {}
        throw new IllegalArgumentException("Kỳ điện phải có định dạng MM/YYYY hoặc YYYY-MM hợp lệ");
    }
    public static String month(String value) { return period(value).format(DateTimeFormatter.ofPattern("MM/uuuu")); }
    public static String snapshot(List<MeterTariff> tariffs) {
        return tariffs.stream().map(t->t.getMinUsage()+"-"+(t.getMaxUsage()==null?"∞":t.getMaxUsage())+": "+t.getUnitPrice()+" đ/kWh")
            .collect(java.util.stream.Collectors.joining("; "));
    }
    /**
     * Accept zero-based breakpoints (0-50, 50-100) and inclusive bands (1-50, 51-100).
     * Validate the complete schedule before calculating; do not change persisted rates or issued bills.
     */
    public static long amount(BigDecimal usage,List<MeterTariff> tariffs) {
        if(usage==null||usage.signum()<0)throw new IllegalArgumentException("Điện năng tiêu thụ không hợp lệ");
        if(tariffs.isEmpty())throw new IllegalArgumentException("Chưa cấu hình biểu giá điện");
        boolean breakpoints=usesBreakpoints(tariffs);
        BigDecimal remaining=usage;long total=0;
        for(var tariff:tariffs) {
            if(remaining.signum()<=0)break;
            BigDecimal capacity=tariff.getMaxUsage()==null?remaining:
                BigDecimal.valueOf((long)tariff.getMaxUsage()-tariff.getMinUsage()+(breakpoints?0:1));
            BigDecimal consumed=remaining.min(capacity);
            total=Math.addExact(total,consumed.multiply(BigDecimal.valueOf(tariff.getUnitPrice())).setScale(0,java.math.RoundingMode.DOWN).longValueExact());
            remaining=remaining.subtract(consumed);
        }
        if(remaining.signum()>0)throw new IllegalArgumentException("Biểu giá chưa bao phủ lượng điện tiêu thụ");
        return total;
    }
    private static boolean usesBreakpoints(List<MeterTariff> tariffs) {
        Boolean breakpoints=null;
        for(int index=0;index<tariffs.size();index++) {
            var tier=tariffs.get(index);
            Integer min=tier.getMinUsage(),max=tier.getMaxUsage();
            if(min==null||min<0||tier.getUnitPrice()==null||tier.getUnitPrice()<0||max!=null&&max<min)
                throw new IllegalArgumentException("Biểu giá điện có bậc không hợp lệ");
            if(index==0) {
                if(min!=0&&min!=1)throw new IllegalArgumentException("Biểu giá phải bắt đầu từ bậc đầu tiên");
            } else {
                Integer previousMax=tariffs.get(index-1).getMaxUsage();
                if(previousMax==null)throw new IllegalArgumentException("Bậc điện không giới hạn phải nằm cuối biểu giá");
                long distance=(long)min-previousMax;
                if(distance!=0&&distance!=1)throw new IllegalArgumentException("Biểu giá điện bị chồng bậc hoặc thiếu khoảng tiêu thụ");
                boolean sharedBoundary=distance==0;
                if(breakpoints!=null&&breakpoints!=sharedBoundary)
                    throw new IllegalArgumentException("Biểu giá điện đang trộn hai cách khai báo mốc; cần dùng thống nhất các bậc");
                breakpoints=sharedBoundary;
            }
        }
        boolean zeroBased=tariffs.getFirst().getMinUsage()==0;
        boolean result=breakpoints==null?zeroBased:breakpoints;
        if(result&&!zeroBased)throw new IllegalArgumentException("Biểu giá dùng mốc liền nhau phải bắt đầu từ 0");
        if(result&&tariffs.stream().anyMatch(t->t.getMaxUsage()!=null&&t.getMaxUsage().equals(t.getMinUsage())))
            throw new IllegalArgumentException("Bậc điện phải có khoảng tiêu thụ lớn hơn 0");
        return result;
    }
}
