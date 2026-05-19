package com.dancu.qlydancu.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.FeeType;
import com.dancu.qlydancu.model.enums.FeeTypeCode;

public interface FeeTypeRepository extends JpaRepository<FeeType, Long> {
    Optional<FeeType> findByCode(FeeTypeCode code);
}