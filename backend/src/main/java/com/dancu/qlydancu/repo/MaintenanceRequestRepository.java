package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.dancu.qlydancu.model.MaintenanceRequest;

public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, Long> {
    @Query(value = """
            SELECT r.*
            FROM requests r
            JOIN households h ON r.household_id = h.id
            WHERE h.apartment_id = :apartmentId
            """, nativeQuery = true)
    List<MaintenanceRequest> findByApartmentId(@Param("apartmentId") Long apartmentId);
}