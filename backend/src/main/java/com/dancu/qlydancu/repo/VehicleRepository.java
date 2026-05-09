package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long>, JpaSpecificationExecutor<Vehicle> {
    List<Vehicle> findByHousehold_Id(Long householdId);

    Page<Vehicle> findByHousehold_Id(Long householdId, Pageable pageable);

    Optional<Vehicle> findByLicensePlate(String licensePlate);

    @Query("SELECT COUNT(v) > 0 FROM Vehicle v WHERE v.licensePlate = :licensePlate")
    boolean existsByLicensePlate(@Param("licensePlate") String licensePlate);
}