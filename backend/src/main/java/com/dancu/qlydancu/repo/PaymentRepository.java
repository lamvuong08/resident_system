package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.model.enums.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @Query(value = """
            SELECT p.*
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            WHERE b.apartment_id = :apartmentId
            """, nativeQuery = true)
    List<Payment> findByApartmentId(@Param("apartmentId") Long apartmentId);

    // Tìm các giao dịch theo trạng thái (dùng cho Admin lấy danh sách chờ duyệt)
    List<Payment> findByStatus(PaymentStatus status);

    // Lấy lịch sử thanh toán của 1 hóa đơn
    List<Payment> findByBill_Id(Long billId);
}
