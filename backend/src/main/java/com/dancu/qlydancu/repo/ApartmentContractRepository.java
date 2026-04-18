package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.ApartmentContract;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApartmentContractRepository extends JpaRepository<ApartmentContract, Long> {
    List<ApartmentContract> findByApartmentId(Long apartmentId);
}
