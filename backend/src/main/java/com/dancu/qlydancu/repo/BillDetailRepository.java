package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.BillDetail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillDetailRepository extends JpaRepository<BillDetail, Long> {
    List<BillDetail> findByBill_Id(Long billId);
}