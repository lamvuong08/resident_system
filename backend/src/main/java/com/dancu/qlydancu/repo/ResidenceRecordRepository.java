package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.ResidenceRecord;
import com.dancu.qlydancu.model.enums.ResidenceRecordType;
import com.dancu.qlydancu.repo.projection.ResidenceRecordRowProjection;
import com.dancu.qlydancu.model.enums.ResidenceRecordStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface ResidenceRecordRepository extends JpaRepository<ResidenceRecord, Long> {
    List<ResidenceRecord> findByResident_Id(Long residentId);

  @Modifying
  @Transactional
  @Query("UPDATE ResidenceRecord rr SET rr.status = :status WHERE rr.id = :id")
  int updateStatusById(@Param("id") Long id, @Param("status") ResidenceRecordStatus status);

    @Query(value = """
        SELECT
            rr.id AS id,
        rr.id AS recordCode,
        r.id AS residentId,
        COALESCE(r.full_name, rr.guest_name) AS residentName,
        COALESCE(r.full_name, rr.guest_name) AS submittedByName,
        CASE
          WHEN rr.type = 'TEMPORARY_STAY' THEN COALESCE(rr.guest_name, r.full_name)
          ELSE COALESCE(r.full_name, rr.guest_name)
        END AS relatedPersonName,
            COALESCE(r.cccd, rr.guest_cccd) AS cccd,
            b.code AS buildingCode,
            b.name AS buildingName,
            a.code AS apartmentCode,
            a.floor_number AS floorNumber,
            a.room_number AS roomNumber,
            COALESCE(head.full_name, '') AS headOfHouseholdName,
            rr.type AS type,
            rr.status AS status,
            rr.reason AS reason,
            rr.guest_name AS guestName,
            rr.guest_cccd AS guestCccd,
            rr.guest_phone AS guestPhone,
            rr.start_date AS startDate,
            rr.end_date AS endDate
        FROM residence_records rr
        LEFT JOIN residents r ON rr.resident_id = r.id
          JOIN households h ON rr.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
        JOIN buildings b ON a.building_id = b.id
        LEFT JOIN (
            SELECT household_id, MIN(id) AS head_id
            FROM residents
            WHERE relationship = 'HEAD'
            GROUP BY household_id
        ) head_map ON head_map.household_id = h.id
        LEFT JOIN residents head ON head.id = head_map.head_id
        WHERE 1 = 1
          AND (:buildingCode IS NULL OR b.code = :buildingCode)
          AND (:apartmentCode IS NULL OR a.code = :apartmentCode)
          AND (:type IS NULL OR rr.type = :type)
          AND (:status IS NULL OR rr.status = :status)
          AND (:fromDate IS NULL OR rr.start_date >= :fromDate)
          AND (:toDate IS NULL OR rr.start_date <= :toDate)
          AND (
            :keyword IS NULL
            OR LOWER(COALESCE(r.full_name, rr.guest_name)) LIKE CONCAT('%', LOWER(:keyword), '%')
            OR COALESCE(r.cccd, rr.guest_cccd) LIKE CONCAT('%', :keyword, '%')
          )
        ORDER BY
          CASE
            WHEN rr.status = 'PENDING' THEN 1
            WHEN rr.status = 'APPROVED' THEN 2
            WHEN rr.status = 'REJECTED' THEN 3
            ELSE 4
          END ASC,
          rr.start_date DESC,
          rr.id DESC
        """, nativeQuery = true)
    List<ResidenceRecordRowProjection> findResidenceRows(
            @Param("buildingCode") String buildingCode,
            @Param("apartmentCode") String apartmentCode,
            @Param("type") String type,
            @Param("status") String status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("keyword") String keyword
    );

      List<ResidenceRecord> findByTypeAndStatusAndEndDateBefore(ResidenceRecordType type, ResidenceRecordStatus status, LocalDate date);

    @Query(value = """
        SELECT COUNT(DISTINCT rr.resident_id)
        FROM residence_records rr
        WHERE rr.resident_id IS NOT NULL
          AND UPPER(TRIM(rr.type)) IN ('TEMPORARY_ABSENCE', 'TEMP_ABSENCE')
          AND UPPER(TRIM(rr.status)) = 'APPROVED'
          AND (rr.start_date IS NULL OR rr.start_date <= CURRENT_DATE)
          AND (rr.end_date IS NULL OR rr.end_date >= CURRENT_DATE)
        """, nativeQuery = true)
    long countActiveApprovedTemporaryAbsenceResidents();
}