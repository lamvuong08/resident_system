package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.MeterTariff;

public interface MeterTariffRepository extends JpaRepository<MeterTariff, Long> {
    List<MeterTariff> findByMeterTypeIdOrderByMinUsageAsc(Long meterTypeId);
}
