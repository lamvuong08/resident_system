package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.ResidenceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResidenceRecordRepository extends JpaRepository<ResidenceRecord, Long> {
    List<ResidenceRecord> findByResident_Id(Long residentId);
}