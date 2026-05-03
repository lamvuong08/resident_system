package com.dancu.qlydancu.repo;

import java.util.List;
import java.util.Optional;
import com.dancu.qlydancu.model.Household;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HouseholdRepository extends JpaRepository<Household, Long> {
    Optional<Household> findByApartment_Code(String apartmentCode);
    Optional<Household> findByUser_Id(Long userId);
    Optional<Household> findByUser_Email(String email);

    @Query("SELECT h FROM Household h WHERE h.apartment.building.id IN :buildingIds")
    List<Household> findByBuildingIds(@Param("buildingIds") List<Long> buildingIds);

    @Query("SELECT h FROM Household h WHERE h.apartment.id IN :apartmentIds")
    List<Household> findByApartmentIds(@Param("apartmentIds") List<Long> apartmentIds);

    @Query("SELECT h FROM Household h WHERE h.apartment.building.id = :buildingId AND h.apartment.floorNumber = :floorNumber")
    List<Household> findByBuildingAndFloor(@Param("buildingId") Long buildingId,
            @Param("floorNumber") Integer floorNumber);
}