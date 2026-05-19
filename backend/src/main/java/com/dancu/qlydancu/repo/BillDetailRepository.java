package com.dancu.qlydancu.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.enums.BillDetailStatus;

public interface BillDetailRepository extends JpaRepository<BillDetail, Long>, JpaSpecificationExecutor<BillDetail> {
    List<BillDetail> findByBill_Id(Long billId);

    List<BillDetail> findByBill_Apartment_Id(Long apartmentId);

    List<BillDetail> findByBill_Apartment_IdAndBill_StatusIn(Long apartmentId, List<BillDetailStatus> statuses);

    List<BillDetail> findByBillIsNull();

    Optional<BillDetail> findByBillIdAndFeeTypeId(Long billId, Long feeTypeId);
}