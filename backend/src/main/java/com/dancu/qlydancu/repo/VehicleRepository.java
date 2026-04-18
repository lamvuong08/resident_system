package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByHousehold_Id(Long householdId);
}