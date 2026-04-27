package com.dancu.qlydancu.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.status.ApartmentStatus;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
    long countByStatus(ApartmentStatus status);

    List<Apartment> findByBuilding_Id(Long buildingId);
    List<Apartment> findByBuilding_Code(String buildingCode);

    Optional<Apartment> findByCode(String code);

    List<Apartment> findByBuildingId(Long buildingId);
    List<Apartment> findByBuildingIdAndFloorNumber(Long buildingId, Integer floorNumber);
    List<Apartment> findByBuilding_CodeAndFloorNumber(String buildingCode, Integer floorNumber);
}
