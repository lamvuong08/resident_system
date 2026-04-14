package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Resident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResidentRepository extends JpaRepository<Resident, Long> {
    long countByApartment_Building_Code(String buildingCode);
    java.util.List<com.dancu.qlydancu.model.Resident> findByApartment_Code(String apartmentCode);
}
