package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.enums.BillDetailStatus;

public interface BillDetailRepository extends JpaRepository<BillDetail, Long> {
    List<BillDetail> findByBill_Id(Long billId);

    // Tối ưu: Chỉ lấy chi tiết hóa đơn của một căn hộ
    List<BillDetail> findByBill_Apartment_Id(Long apartmentId);
    
    // Tối ưu: Lấy chi tiết hóa đơn theo căn hộ và trạng thái
    List<BillDetail> findByBill_Apartment_IdAndBill_StatusIn(Long apartmentId, List<BillDetailStatus> statuses);
}