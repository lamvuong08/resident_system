package com.dancu.qlydancu.sepay;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SePayTransactionRepository extends JpaRepository<SePayTransaction,String>, SePayTransactionClaim {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from SePayTransaction t where t.transactionKey=:key or (:reference is not null and t.referenceKey=:reference)")
    Optional<SePayTransaction> findLocked(@Param("key") String key,@Param("reference") String reference);
}
