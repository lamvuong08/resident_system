package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.status.ApartmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
    long countByStatus(ApartmentStatus status);
    List<Apartment> findByBuilding_Code(String buildingCode);
}
