package com.dancu.qlydancu.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.FeeType;
import com.dancu.qlydancu.model.enums.FeeTypeCode;

import com.dancu.qlydancu.model.enums.CalculationType;
import java.util.List;

public interface FeeTypeRepository extends JpaRepository<FeeType, Long> {
    Optional<FeeType> findByCode(FeeTypeCode code);
    List<FeeType> findAllByCalculationType(CalculationType calculationType);
}