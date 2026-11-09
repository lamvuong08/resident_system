package com.dancu.qlydancu.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.enums.BillDetailStatus;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BillRepository extends JpaRepository<Bill, Long>, JpaSpecificationExecutor<Bill> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select b from Bill b where b.id=:id")
    Optional<Bill> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
    List<Bill> findByApartment_Id(Long apartmentId);

    List<Bill> findByApartmentIdAndStatusIn(Long apartmentId, List<BillDetailStatus> statuses);

    Optional<Bill> findByApartmentIdAndBillingMonth(Long apartmentId, String billingMonth);
}
