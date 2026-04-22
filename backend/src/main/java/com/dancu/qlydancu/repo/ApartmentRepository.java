package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.status.ApartmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
    long countByStatus(ApartmentStatus status);
    List<Apartment> findByBuilding_Id(Long buildingId);
    List<Apartment> findByBuilding_Code(String buildingCode);
    Optional<Apartment> findByCode(String code);
}
