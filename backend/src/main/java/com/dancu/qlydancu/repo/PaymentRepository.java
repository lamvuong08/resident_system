package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.model.enums.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @Query("SELECT DISTINCT p FROM Payment p " +
            "JOIN p.paymentDetails pd " +
            "JOIN pd.billDetail bd " +
            "JOIN bd.bill b " +
            "WHERE b.apartment.id = :apartmentId")
    List<Payment> findByApartmentId(@Param("apartmentId") Long apartmentId);

    // Tìm các giao dịch theo trạng thái (dùng cho Admin lấy danh sách chờ duyệt)
    List<Payment> findByStatus(PaymentStatus status);
}
