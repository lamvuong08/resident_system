package com.dancu.qlydancu;

import com.dancu.qlydancu.repo.ResidentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class DashboardResidentCountConsistencyTest {

    @Autowired
    private ResidentRepository residentRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void dashboardResidentCountMustMatchLivingResidentsJoinQuery() {
        Long expected = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM residents r
            JOIN households h ON r.household_id = h.id
            JOIN apartments a ON h.apartment_id = a.id
            JOIN buildings b ON a.building_id = b.id
            WHERE UPPER(TRIM(r.occupancy_status)) = 'LIVING'
            """, Long.class);

        long actual = residentRepository.countDashboardResidents(null);

        assertEquals(expected, actual, "Dashboard total living residents must match the standard LIVING join query");
    }
}
