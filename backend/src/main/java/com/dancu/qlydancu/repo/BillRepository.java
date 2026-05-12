package com.dancu.qlydancu.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.enums.BillDetailStatus;

public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByApartment_Id(Long apartmentId);

    List<Bill> findByApartmentIdAndStatusIn(Long apartmentId, List<BillDetailStatus> statuses);
}