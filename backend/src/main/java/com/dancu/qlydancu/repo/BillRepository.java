package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Bill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByApartment_Id(Long apartmentId);
}