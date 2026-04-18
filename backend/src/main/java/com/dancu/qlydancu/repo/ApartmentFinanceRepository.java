package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.ApartmentFinance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApartmentFinanceRepository extends JpaRepository<ApartmentFinance, Long> {
    List<ApartmentFinance> findByApartmentId(Long apartmentId);
}
