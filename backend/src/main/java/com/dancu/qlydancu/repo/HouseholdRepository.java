package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Household;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HouseholdRepository extends JpaRepository<Household, Long> {
    Optional<Household> findByApartment_Code(String apartmentCode);
    Optional<Household> findByUser_Id(Long userId);
    Optional<Household> findByUser_Email(String email);
}