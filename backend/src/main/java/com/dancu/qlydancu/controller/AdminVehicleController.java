package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.model.enums.VehicleStatus;
import com.dancu.qlydancu.service.VehicleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/vehicles")
@PreAuthorize("hasRole('ADMIN')")
public class AdminVehicleController {

    @Autowired
    private VehicleService vehicleService;

    @GetMapping
    public ResponseEntity<?> getVehicles(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(vehicleService.getAllVehicles(search, status, pageable));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        VehicleStatus vStatus = VehicleStatus.valueOf(payload.get("status"));
        if (vStatus != VehicleStatus.ACTIVE && vStatus != VehicleStatus.REJECTED) {
            throw new IllegalArgumentException("Chỉ chấp nhận ACTIVE hoặc REJECTED.");
        }
        return ResponseEntity.ok(vehicleService.updateStatus(id, vStatus));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatusPatch(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return updateStatus(id, payload);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVehicle(@PathVariable Long id) {
        vehicleService.deleteVehicle(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa phương tiện"));
    }
}
