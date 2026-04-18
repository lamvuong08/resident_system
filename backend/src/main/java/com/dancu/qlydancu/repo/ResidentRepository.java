package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Resident;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResidentRepository extends JpaRepository<Resident, Long> {
    List<Resident> findByHouseholdId(Long householdId);

    @Query(value = """
        SELECT COUNT(*)
        FROM residents r
        JOIN households h ON r.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
        JOIN buildings b ON a.building_id = b.id
        WHERE b.code = :buildingCode
        """, nativeQuery = true)
    long countByApartment_Building_Code(@Param("buildingCode") String buildingCode);

    @Query(value = """
        SELECT r.*
        FROM residents r
        JOIN households h ON r.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
            WHERE a.code = :apartmentCode
        """, nativeQuery = true)
    List<Resident> findByApartment_Code(@Param("apartmentCode") String apartmentCode);

    @Query(value = """
        SELECT r.*
        FROM residents r
        JOIN households h ON r.household_id = h.id
        WHERE h.apartment_id = :apartmentId
        """, nativeQuery = true)
    List<Resident> findByApartmentId(@Param("apartmentId") Long apartmentId);

        @Query(value = """
            SELECT COUNT(*)
            FROM residents r
            JOIN households h ON r.household_id = h.id
            JOIN apartments a ON h.apartment_id = a.id
                WHERE a.code = :apartmentCode
            """, nativeQuery = true)
        long countByApartmentCode(@Param("apartmentCode") String apartmentCode);

        @Query(value = """
            SELECT r.full_name
            FROM residents r
            JOIN households h ON r.household_id = h.id
            JOIN apartments a ON h.apartment_id = a.id
            WHERE a.code = :apartmentCode AND r.relationship = 'HEAD'
            ORDER BY r.id ASC
            LIMIT 1
            """, nativeQuery = true)
        String findOwnerNameByApartmentCode(@Param("apartmentCode") String apartmentCode);
}
