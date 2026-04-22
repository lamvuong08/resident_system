package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.enums.OccupancyStatus;
import com.dancu.qlydancu.model.enums.ResidentCategory;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.repo.projection.ResidentAdminRowProjection;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResidentRepository extends JpaRepository<Resident, Long> {
    List<Resident> findByHouseholdId(Long householdId);

        @Query(value = """
                SELECT COUNT(*)
                FROM residence_records rr
                WHERE rr.household_id = :householdId
                    AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                    AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                    AND (
                        (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(:cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(:cccd)))
                        OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(:fullName), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(:fullName)))
                    )
                """, nativeQuery = true)
        long countApprovedTemporaryStayRecordsForResident(
                        @Param("householdId") Long householdId,
                        @Param("fullName") String fullName,
                        @Param("cccd") String cccd
        );

        @Query(value = """
                SELECT CASE WHEN COALESCE(UPPER(TRIM(r.resident_category)), '') <> 'TEMPORARY' THEN 1
                             ELSE CASE WHEN EXISTS (
                                        SELECT 1
                                        FROM residence_records rr
                                        WHERE rr.household_id = r.household_id
                                            AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                                            AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                                            AND (
                                                (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(r.cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(r.cccd)))
                                                OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(r.full_name), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(r.full_name)))
                                            )
                             ) THEN 1 ELSE 0 END END
                FROM residents r
                WHERE r.id = :residentId
                """, nativeQuery = true)
        int isValidResidentRow(@Param("residentId") Long residentId);

    @Query(value = """
        SELECT COUNT(*)
        FROM residents r
        JOIN households h ON r.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
        JOIN buildings b ON a.building_id = b.id
        WHERE b.code = :buildingCode
                    AND UPPER(TRIM(r.occupancy_status)) IN ('LIVING', 'TEMP_ABSENT', 'TEMP_ABSENCE', 'ABSENT')
                    AND (
                        COALESCE(UPPER(TRIM(r.resident_category)), '') <> 'TEMPORARY'
                        OR EXISTS (
                            SELECT 1
                            FROM residence_records rr
                            WHERE rr.household_id = r.household_id
                                AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                                AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                                AND (
                                    (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(r.cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(r.cccd)))
                                    OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(r.full_name), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(r.full_name)))
                                )
                        )
                    )
        """, nativeQuery = true)
    long countByApartment_Building_Code(@Param("buildingCode") String buildingCode);

    @Query(value = """
        SELECT r.*
        FROM residents r
        JOIN households h ON r.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
        WHERE a.code = :apartmentCode
                    AND (
                        COALESCE(UPPER(TRIM(r.resident_category)), '') <> 'TEMPORARY'
                        OR EXISTS (
                            SELECT 1
                            FROM residence_records rr
                            WHERE rr.household_id = r.household_id
                                AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                                AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                                AND (
                                    (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(r.cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(r.cccd)))
                                    OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(r.full_name), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(r.full_name)))
                                )
                        )
                    )
        ORDER BY r.full_name ASC
        """, nativeQuery = true)
    List<Resident> findByApartment_Code(@Param("apartmentCode") String apartmentCode);

    @Query(value = """
        SELECT r.*
        FROM residents r
        JOIN households h ON r.household_id = h.id
        WHERE h.apartment_id = :apartmentId
                    AND (
                        COALESCE(UPPER(TRIM(r.resident_category)), '') <> 'TEMPORARY'
                        OR EXISTS (
                            SELECT 1
                            FROM residence_records rr
                            WHERE rr.household_id = r.household_id
                                AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                                AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                                AND (
                                    (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(r.cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(r.cccd)))
                                    OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(r.full_name), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(r.full_name)))
                                )
                        )
                    )
        ORDER BY r.full_name ASC
        """, nativeQuery = true)
    List<Resident> findByApartmentId(@Param("apartmentId") Long apartmentId);

    @Query(value = """
        SELECT COUNT(*)
        FROM residents r
        JOIN households h ON r.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
        WHERE a.code = :apartmentCode
                    AND UPPER(TRIM(r.occupancy_status)) IN ('LIVING', 'TEMP_ABSENT', 'TEMP_ABSENCE', 'ABSENT')
                    AND (
                        COALESCE(UPPER(TRIM(r.resident_category)), '') <> 'TEMPORARY'
                        OR EXISTS (
                            SELECT 1
                            FROM residence_records rr
                            WHERE rr.household_id = r.household_id
                                AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                                AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                                AND (
                                    (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(r.cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(r.cccd)))
                                    OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(r.full_name), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(r.full_name)))
                                )
                        )
                    )
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

    Optional<Resident> findByCccd(String cccd);

    Optional<Resident> findFirstByHouseholdIdAndNameIgnoreCaseAndPhone(Long householdId, String name, String phone);

    Optional<Resident> findFirstByHouseholdIdAndNameIgnoreCase(Long householdId, String name);

    @Query(value = """
        SELECT COUNT(*)
        FROM residents r
        JOIN households h ON r.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
        JOIN buildings b ON a.building_id = b.id
        WHERE (:buildingCode IS NULL OR b.code = :buildingCode)
                    AND UPPER(TRIM(r.occupancy_status)) = 'LIVING'
                    AND (
                        COALESCE(UPPER(TRIM(r.resident_category)), '') <> 'TEMPORARY'
                        OR EXISTS (
                            SELECT 1
                            FROM residence_records rr
                            WHERE rr.household_id = r.household_id
                                AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                                AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                                AND (
                                    (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(r.cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(r.cccd)))
                                    OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(r.full_name), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(r.full_name)))
                                )
                        )
                    )
        """, nativeQuery = true)
    long countDashboardResidents(@Param("buildingCode") String buildingCode);

    @Query(value = """
        SELECT COUNT(*)
        FROM residents r
        WHERE UPPER(TRIM(r.occupancy_status)) = 'LIVING'
        """, nativeQuery = true)
    long countLivingResidents();

    @Query(value = """
        SELECT COUNT(*)
        FROM residents r
                WHERE UPPER(TRIM(r.resident_category)) = 'TEMPORARY'
                    AND UPPER(TRIM(r.occupancy_status)) = 'LIVING'
        """, nativeQuery = true)
    long countTemporaryResidents();

    @Query(value = """
        SELECT COUNT(*)
        FROM residents r
        WHERE UPPER(TRIM(r.occupancy_status)) IN ('TEMP_ABSENT', 'TEMP_ABSENCE', 'TEMPORARY_ABSENCE', 'ABSENT')
        """, nativeQuery = true)
    long countTemporaryAbsentResidents();

    @Query(value = """
        SELECT r.*
        FROM residents r
        JOIN households h ON r.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
        JOIN buildings b ON a.building_id = b.id
        WHERE (:buildingCode IS NULL OR b.code = :buildingCode)
          AND (:apartmentCode IS NULL OR a.code = :apartmentCode)
          AND (:keyword IS NULL OR LOWER(r.full_name) LIKE CONCAT('%', LOWER(:keyword), '%') OR r.cccd LIKE CONCAT('%', :keyword, '%'))
          AND (:occupancyStatus IS NULL OR UPPER(TRIM(r.occupancy_status)) = :occupancyStatus)
          AND (:residentCategory IS NULL OR UPPER(TRIM(r.resident_category)) = :residentCategory)
                    AND (
                        COALESCE(UPPER(TRIM(r.resident_category)), '') <> 'TEMPORARY'
                        OR EXISTS (
                            SELECT 1
                            FROM residence_records rr
                            WHERE rr.household_id = r.household_id
                                AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                                AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                                AND (
                                    (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(r.cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(r.cccd)))
                                    OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(r.full_name), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(r.full_name)))
                                )
                        )
                    )
          AND (:includeExpiredTemporary = TRUE OR NOT (UPPER(TRIM(r.resident_category)) = 'TEMPORARY' AND UPPER(TRIM(r.occupancy_status)) = 'EXPIRED'))
        ORDER BY r.id DESC
        """, nativeQuery = true)
    List<Resident> searchResidents(
            @Param("buildingCode") String buildingCode,
            @Param("apartmentCode") String apartmentCode,
            @Param("keyword") String keyword,
            @Param("occupancyStatus") String occupancyStatus,
            @Param("residentCategory") String residentCategory,
            @Param("includeExpiredTemporary") boolean includeExpiredTemporary
    );

    @Query(value = """
        SELECT
            r.id AS id,
            r.full_name AS fullName,
            r.dob AS dob,
            r.cccd AS cccd,
            r.phone AS phone,
            r.relationship AS relationship,
            r.resident_category AS residentCategory,
            r.occupancy_status AS occupancyStatus,
            r.household_id AS householdId,
            a.code AS apartmentCode,
            b.code AS buildingCode
        FROM residents r
        JOIN households h ON r.household_id = h.id
        JOIN apartments a ON h.apartment_id = a.id
        JOIN buildings b ON a.building_id = b.id
        WHERE (:buildingCode IS NULL OR b.code = :buildingCode)
          AND (:apartmentCode IS NULL OR a.code = :apartmentCode)
          AND (:keyword IS NULL OR LOWER(r.full_name) LIKE CONCAT('%', LOWER(:keyword), '%') OR r.cccd LIKE CONCAT('%', :keyword, '%'))
          AND (:occupancyStatus IS NULL OR r.occupancy_status = :occupancyStatus)
          AND (:residentCategory IS NULL OR r.resident_category = :residentCategory)
                    AND (
                        COALESCE(UPPER(TRIM(r.resident_category)), '') <> 'TEMPORARY'
                        OR EXISTS (
                            SELECT 1
                            FROM residence_records rr
                            WHERE rr.household_id = r.household_id
                                AND COALESCE(UPPER(TRIM(rr.type)), '') = 'TEMPORARY_STAY'
                                AND COALESCE(UPPER(TRIM(rr.status)), '') = 'APPROVED'
                                AND (
                                    (NULLIF(TRIM(rr.guest_cccd), '') IS NOT NULL AND NULLIF(TRIM(r.cccd), '') IS NOT NULL AND UPPER(TRIM(rr.guest_cccd)) = UPPER(TRIM(r.cccd)))
                                    OR (NULLIF(TRIM(rr.guest_name), '') IS NOT NULL AND NULLIF(TRIM(r.full_name), '') IS NOT NULL AND UPPER(TRIM(rr.guest_name)) = UPPER(TRIM(r.full_name)))
                                )
                        )
                    )
          AND (:includeExpiredTemporary = TRUE OR NOT (r.resident_category = 'TEMPORARY' AND r.occupancy_status = 'EXPIRED'))
        ORDER BY r.id DESC
        """, nativeQuery = true)
    List<ResidentAdminRowProjection> searchResidentAdminRows(
            @Param("buildingCode") String buildingCode,
            @Param("apartmentCode") String apartmentCode,
            @Param("keyword") String keyword,
            @Param("occupancyStatus") String occupancyStatus,
            @Param("residentCategory") String residentCategory,
            @Param("includeExpiredTemporary") boolean includeExpiredTemporary
    );

    List<Resident> findByOccupancyStatusAndResidentCategory(OccupancyStatus occupancyStatus, ResidentCategory residentCategory);
}
