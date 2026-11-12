package com.dancu.qlydancu.sepay;

/** Atomic MySQL insert/upsert used before locking a webhook audit row. */
public interface SePayTransactionClaim {
    void claim(String key, String reference, String raw);
}
