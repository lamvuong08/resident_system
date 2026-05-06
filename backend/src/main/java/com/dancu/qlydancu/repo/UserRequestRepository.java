package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;

import com.dancu.qlydancu.model.UserRequest;

public interface UserRequestRepository extends JpaRepository<UserRequest, Long>, JpaSpecificationExecutor<UserRequest> {
    @Query(value = """
            SELECT r.*
            FROM requests r
            JOIN households h ON r.household_id = h.id
            WHERE h.apartment_id = :apartmentId
            """, nativeQuery = true)
    List<UserRequest> findByApartmentId(@Param("apartmentId") Long apartmentId);

    @Query("SELECT ur FROM UserRequest ur WHERE ur.household.id = :householdId")
    Page<UserRequest> findByHouseholdId(@Param("householdId") Long householdId, Pageable pageable);

    @Query("SELECT ur FROM UserRequest ur WHERE ur.household.id = :householdId ORDER BY ur.createdAt DESC")
    List<UserRequest> findByHouseholdIdOrderByCreatedAtDesc(@Param("householdId") Long householdId);

    @Query("SELECT COUNT(ur) FROM UserRequest ur WHERE ur.household.id = :householdId")
    long countByHouseholdId(@Param("householdId") Long householdId);

    @Query("SELECT COUNT(ur) FROM UserRequest ur WHERE ur.household.id = :householdId AND ur.status = :status")
    long countByHouseholdIdAndStatus(
            @Param("householdId") Long householdId,
            @Param("status") com.dancu.qlydancu.model.enums.RequestStatus status);

}
