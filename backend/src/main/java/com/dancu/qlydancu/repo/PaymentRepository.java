package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.model.enums.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id=:id")
    java.util.Optional<Payment> findLockedById(@Param("id") Long id);

    @Query("select distinct pd.billDetail.bill.id from PaymentDetail pd where pd.payment.id=:id order by pd.billDetail.bill.id")
    List<Long> findBillIdsForPayment(@Param("id") Long id);
    @Query("SELECT DISTINCT p FROM Payment p " +
            "JOIN p.paymentDetails pd " +
            "JOIN pd.billDetail bd " +
            "JOIN bd.bill b " +
            "WHERE b.apartment.id = :apartmentId")
    List<Payment> findByApartmentId(@Param("apartmentId") Long apartmentId);
    List<Payment> findByStatus(PaymentStatus status);

    @Query(value = "SELECT p.* FROM payments p " +
                   "JOIN payment_details pd ON p.id = pd.payment_id " +
                   "JOIN bill_details bd ON pd.bill_detail_id = bd.id " +
                   "WHERE bd.bill_id = :billId AND p.status = 'SUCCESS' " +
                   "ORDER BY p.paid_at DESC LIMIT 1", nativeQuery = true)
    Payment findLatestSuccessfulPaymentByBillId(@Param("billId") Long billId);
}
