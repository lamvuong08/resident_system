package com.dancu.qlydancu.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.MeterReading;

public interface MeterReadingRepository extends JpaRepository<MeterReading, Long> {
    MeterReading findFirstByApartmentIdAndMeterTypeIdOrderByCreatedAtDesc(Long apartmentId, Long meterTypeId);

    Optional<MeterReading> findFirstByApartmentIdAndMeterTypeIdAndBillingMonth(Long apartmentId, Long meterTypeId, String billingMonth);

    List<MeterReading> findByMeterTypeIdAndBillingMonth(Long meterTypeId, String billingMonth);

    MeterReading findFirstByApartmentIdAndMeterTypeIdAndBillingMonthNotOrderByCreatedAtDesc(Long apartmentId, Long meterTypeId, String billingMonth);

    /** Dùng cho findPreviousMonthReading: lấy tất cả bản ghi của 1 căn hộ + loại đồng hồ để filter theo billingMonth đúng thứ tự thời gian */
    List<MeterReading> findByApartmentIdAndMeterTypeId(Long apartmentId, Long meterTypeId);
}
