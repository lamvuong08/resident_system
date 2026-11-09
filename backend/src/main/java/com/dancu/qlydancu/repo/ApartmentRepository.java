package com.dancu.qlydancu.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.status.ApartmentStatus;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from Apartment a where a.id=:id")
    java.util.Optional<Apartment> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
    long countByStatus(ApartmentStatus status);

    List<Apartment> findByBuilding_Id(Long buildingId);
    List<Apartment> findByBuilding_Code(String buildingCode);
    List<Apartment> findByBuilding_IdAndFloorNumber(Long buildingId, Integer floorNumber);
    List<Apartment> findByFloorNumber(Integer floorNumber);
    Optional<Apartment> findByCode(String code);

    List<Apartment> findByBuildingId(Long buildingId);
    List<Apartment> findByBuildingIdAndFloorNumber(Long buildingId, Integer floorNumber);
    List<Apartment> findByBuilding_CodeAndFloorNumber(String buildingCode, Integer floorNumber);
}
