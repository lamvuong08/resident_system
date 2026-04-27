package com.dancu.qlydancu;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

@SpringBootTest
class UserTableColumnsDiagnosticTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void printUsersTableColumns() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'users'
            ORDER BY ORDINAL_POSITION
            """);

        System.out.println("==== users columns ====");
        System.out.println(rows);
        System.out.println("=======================");
    }
}
