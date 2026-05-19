package com.dancu.qlydancu.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.MeterReading;

public interface MeterReadingRepository extends JpaRepository<MeterReading, Long>{
    MeterReading findFirstByApartmentIdAndMeterTypeIdOrderByCreatedAtDesc(Long apartmentId, Long meterTypeId);
}
