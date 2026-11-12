package com.dancu.qlydancu.sepay;

import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

public class SePayTransactionClaimImpl implements SePayTransactionClaim {
    private final JdbcTemplate jdbc;
    private final EntityManager entityManager;

    public SePayTransactionClaimImpl(JdbcTemplate jdbc, EntityManager entityManager) {
        this.jdbc = jdbc;
        this.entityManager = entityManager;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void claim(String key, String reference, String raw) {
        // Match the native JPA query's flush behavior before executing JDBC in the same transaction.
        entityManager.flush();
        // Unique indexes serialize simultaneous retries without overwriting the original audit.
        jdbc.update("""
            INSERT INTO sepay_transactions (transaction_key, reference_key, raw_payload, outcome, received_at)
            VALUES (?, ?, ?, 'RECEIVED', CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE transaction_key = transaction_key
            """, key, reference, raw);
    }
}
