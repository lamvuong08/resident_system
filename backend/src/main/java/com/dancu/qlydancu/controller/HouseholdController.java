package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/households")
public class HouseholdController {

    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;

    public HouseholdController(HouseholdRepository householdRepository,
                               ResidentRepository residentRepository) {
        this.householdRepository = householdRepository;
        this.residentRepository = residentRepository;
    }

    @GetMapping("/me/summary")
    public ResponseEntity<Map<String, Object>> getMyHouseholdSummary(Authentication authentication) {
        Household household = findCurrentHousehold(authentication);
        if (household == null) {
            return ResponseEntity.notFound().build();
        }

        List<Resident> householdResidents = residentRepository.findByHouseholdId(household.getId());
        return ResponseEntity.ok(toHouseholdSummary(household, householdResidents));
    }

    @GetMapping("/me/residents")
    public ResponseEntity<List<Map<String, Object>>> getMyHouseholdResidents(Authentication authentication) {
        Household household = findCurrentHousehold(authentication);
        if (household == null) {
            return ResponseEntity.notFound().build();
        }

        List<Resident> householdResidents = residentRepository.findByHouseholdId(household.getId());
        List<Map<String, Object>> response = new ArrayList<>();
        for (Resident resident : householdResidents) {
            response.add(toResidentResponse(resident));
        }
        return ResponseEntity.ok(response);
    }

    private Household findCurrentHousehold(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return householdRepository.findByUser_Email(authentication.getName()).orElse(null);
    }

    private Map<String, Object> toHouseholdSummary(Household household, List<Resident> residents) {
        String apartmentCode = household.getApartment() != null ? household.getApartment().getCode() : null;

        Map<String, Object> summary = new HashMap<>();
        summary.put("householdId", household.getId());
        summary.put("apartmentCode", apartmentCode);
        summary.put("memberCount", residents.size());
        summary.put("ownerName", residents.stream()
                .filter(resident -> resident.getRelationship() != null && "HEAD".equals(resident.getRelationship().name()))
                .map(Resident::getName)
                .findFirst()
                .orElse(null));

        return summary;
    }

    private Map<String, Object> toResidentResponse(Resident resident) {
        Map<String, Object> residentResponse = new HashMap<>();
        residentResponse.put("id", resident.getId());
        residentResponse.put("name", resident.getName());
        residentResponse.put("gender", resident.getGender() != null ? resident.getGender().name() : null);
        residentResponse.put("dob", resident.getDob());
        residentResponse.put("age", resident.getAge());
        residentResponse.put("cccd", resident.getCccd());
        residentResponse.put("phone", resident.getPhone());
        residentResponse.put("relationship", resident.getRelationship() != null ? resident.getRelationship().name() : null);
        residentResponse.put("residentCategory", resident.getResidentCategory() != null ? resident.getResidentCategory().name() : null);
        residentResponse.put("occupancyStatus", resident.getOccupancyStatus() != null ? resident.getOccupancyStatus().name() : null);
        residentResponse.put("status", resident.getStatus());
        residentResponse.put("householdId", resident.getHouseholdId());
        return residentResponse;
    }
}
