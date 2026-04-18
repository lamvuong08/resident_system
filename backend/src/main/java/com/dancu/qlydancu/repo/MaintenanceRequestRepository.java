package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.MaintenanceRequest;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, Long> {
    @Query(value = """
            SELECT r.*
            FROM requests r
            JOIN households h ON r.household_id = h.id
            WHERE h.apartment_id = :apartmentId
            """, nativeQuery = true)
    List<MaintenanceRequest> findByApartmentId(@Param("apartmentId") Long apartmentId);
}
