package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Payment;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @Query(value = """
            SELECT p.*
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            WHERE b.apartment_id = :apartmentId
            """, nativeQuery = true)
    List<Payment> findByApartmentId(@Param("apartmentId") Long apartmentId);
}
