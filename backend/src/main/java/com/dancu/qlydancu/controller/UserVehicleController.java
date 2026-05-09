package com.dancu.qlydancu.controller;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.dancu.qlydancu.model.enums.VehicleType;
import com.dancu.qlydancu.service.VehicleService;

@RestController
@RequestMapping("/api/user/vehicles")
@PreAuthorize("hasRole('USER')")
public class UserVehicleController {

    @Autowired
    private VehicleService vehicleService;

    @GetMapping
    public ResponseEntity<?> getMyVehicles(Authentication authentication) {
        return ResponseEntity.ok(vehicleService.getVehiclesByHousehold(authentication.getName()));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createVehicle(
            @RequestPart("license_plate") String licensePlate,
            @RequestPart("type") String type,
            @RequestPart("file") MultipartFile file,
            Authentication authentication) {

        VehicleType vehicleType;
        try {
            vehicleType = VehicleType.valueOf(type.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Loại phương tiện không hợp lệ.");
        }
        return ResponseEntity.ok(vehicleService.createVehicle(authentication.getName(), licensePlate, vehicleType, file));
    }
}
