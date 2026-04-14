package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Building;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BuildingRepository extends JpaRepository<Building, Long> {
    Building findByCode(String code);
}
