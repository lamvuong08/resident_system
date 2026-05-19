package com.dancu.qlydancu.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.enums.BillDetailStatus;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BillRepository extends JpaRepository<Bill, Long>, JpaSpecificationExecutor<Bill> {
    List<Bill> findByApartment_Id(Long apartmentId);

    List<Bill> findByApartmentIdAndStatusIn(Long apartmentId, List<BillDetailStatus> statuses);

    Optional<Bill> findByApartmentIdAndBillingMonth(Long apartmentId, String billingMonth);
}