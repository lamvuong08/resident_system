package com.dancu.qlydancu;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

@SpringBootTest
class DashboardResidentMismatchDiagnosticTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void printDashboardResidentMismatch() {
        Long legacyTotalLiving = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM residents r
            WHERE UPPER(TRIM(r.occupancy_status)) = 'LIVING'
            """, Long.class);

        Long totalDashboard = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM residents r
            JOIN households h ON r.household_id = h.id
            JOIN apartments a ON h.apartment_id = a.id
            JOIN buildings b ON a.building_id = b.id
            WHERE UPPER(TRIM(r.occupancy_status)) = 'LIVING'
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
            """, Long.class);

        List<Map<String, Object>> groupedByBuilding = jdbcTemplate.queryForList("""
            SELECT b.code AS building_code, COUNT(*) AS resident_count
            FROM residents r
            JOIN households h ON r.household_id = h.id
            JOIN apartments a ON h.apartment_id = a.id
            JOIN buildings b ON a.building_id = b.id
            WHERE UPPER(TRIM(r.occupancy_status)) = 'LIVING'
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
            GROUP BY b.code
            ORDER BY b.code
            """);

        List<Map<String, Object>> orphanResidents = jdbcTemplate.queryForList("""
            SELECT r.id, r.full_name, r.cccd, r.phone, r.occupancy_status, r.resident_category, r.household_id,
                   h.id AS household_exists,
                   h.apartment_id,
                   a.building_id,
                   b.code AS building_code
            FROM residents r
            LEFT JOIN households h ON r.household_id = h.id
            LEFT JOIN apartments a ON h.apartment_id = a.id
            LEFT JOIN buildings b ON a.building_id = b.id
            WHERE UPPER(TRIM(r.occupancy_status)) = 'LIVING'
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
              AND (h.id IS NULL OR h.apartment_id IS NULL OR a.id IS NULL OR a.building_id IS NULL OR b.id IS NULL)
            ORDER BY r.id
            """);

        List<Map<String, Object>> legacyOnlyResidents = jdbcTemplate.queryForList("""
            SELECT r.id, r.full_name, r.cccd, r.phone, r.occupancy_status, r.resident_category, r.household_id,
                   h.id AS household_exists,
                   h.apartment_id,
                   a.building_id,
                   b.code AS building_code
            FROM residents r
            LEFT JOIN households h ON r.household_id = h.id
            LEFT JOIN apartments a ON h.apartment_id = a.id
            LEFT JOIN buildings b ON a.building_id = b.id
            WHERE UPPER(TRIM(r.occupancy_status)) = 'LIVING'
              AND NOT (
                  h.id IS NOT NULL
                  AND a.id IS NOT NULL
                  AND b.id IS NOT NULL
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
              )
            ORDER BY r.id
            """);

        long sumByBuildings = groupedByBuilding.stream()
                .mapToLong(row -> ((Number) row.get("resident_count")).longValue())
                .sum();

        System.out.println("==== Dashboard resident diagnostics ====");
        System.out.println("legacyTotalLiving=" + legacyTotalLiving);
        System.out.println("totalDashboardResidents=" + totalDashboard);
        System.out.println("sumByBuildings=" + sumByBuildings);
        System.out.println("buildingBreakdown=" + groupedByBuilding);
        System.out.println("orphanResidents=" + orphanResidents);
        System.out.println("legacyOnlyResidents=" + legacyOnlyResidents);
        System.out.println("========================================");
    }
}
