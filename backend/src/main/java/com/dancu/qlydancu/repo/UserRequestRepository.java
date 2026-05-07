package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.dancu.qlydancu.model.UserRequest;

public interface UserRequestRepository extends JpaRepository<UserRequest, Long> {
    @Query(value = """
            SELECT r.*
            FROM requests r
            JOIN households h ON r.household_id = h.id
            WHERE h.apartment_id = :apartmentId
            """, nativeQuery = true)
    List<UserRequest> findByApartmentId(@Param("apartmentId") Long apartmentId);

    Page<UserRequest> findByHouseholdId(Long householdId, Pageable pageable);

    List<UserRequest> findByHouseholdIdOrderByCreatedAtDesc(Long householdId);

    long countByHouseholdId(Long householdId);

    long countByHouseholdIdAndStatus(Long householdId, com.dancu.qlydancu.model.enums.RequestStatus status);

    @Query(value = "SELECT r FROM UserRequest r LEFT JOIN FETCH r.household h LEFT JOIN FETCH h.apartment a " +
                   "WHERE (:apartmentCode IS NULL OR LOWER(a.code) LIKE LOWER(CONCAT('%', :apartmentCode, '%')))", 
           countQuery = "SELECT count(r) FROM UserRequest r LEFT JOIN r.household h LEFT JOIN h.apartment a " +
                        "WHERE (:apartmentCode IS NULL OR LOWER(a.code) LIKE LOWER(CONCAT('%', :apartmentCode, '%')))")
    Page<UserRequest> findRequestsByApartmentCode(@Param("apartmentCode") String apartmentCode, Pageable pageable);
}
