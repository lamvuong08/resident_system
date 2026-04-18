package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.repo.BuildingRepository;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import com.dancu.qlydancu.model.Building;
import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.status.ApartmentStatus;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {
    private static final int MOCK_PENDING_REQUESTS = 12;

    private final BuildingRepository buildingRepository;
    private final ApartmentRepository apartmentRepository;
    private final ResidentRepository residentRepository;

    public DashboardController(BuildingRepository buildingRepository,
                               ApartmentRepository apartmentRepository,
                               ResidentRepository residentRepository) {
        this.buildingRepository = buildingRepository;
        this.apartmentRepository = apartmentRepository;
        this.residentRepository = residentRepository;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> statistics = new HashMap<>();
        statistics.put("totalBuildings", buildingRepository.count());
        statistics.put("totalApartments", apartmentRepository.count());
        statistics.put("occupiedApartments", apartmentRepository.countByStatus(ApartmentStatus.OCCUPIED));
        statistics.put("vacantApartments", apartmentRepository.countByStatus(ApartmentStatus.EMPTY));
        statistics.put("totalResidents", residentRepository.count());
        statistics.put("pendingRequests", MOCK_PENDING_REQUESTS);
        return statistics;
    }

    @GetMapping("/buildings")
    public List<Map<String, Object>> buildings() {
        List<Map<String, Object>> buildingSummaries = new ArrayList<>();
        for (Building building : buildingRepository.findAll()) {
            buildingSummaries.add(toBuildingSummary(building));
        }
        return buildingSummaries;
    }

    @GetMapping("/buildings/{id}")
    public Map<String, Object> buildingDetail(@PathVariable String id) {
        Building building = buildingRepository.findByCode(id);
        if (building == null) {
            return emptyBuildingDetail(id);
        }

        List<Apartment> apartments = apartmentRepository.findByBuilding_Code(building.getCode());
        return toBuildingDetail(building, apartments);
    }

    @GetMapping("/apartments/{code}/residents")
    public List<Map<String, Object>> apartmentResidents(@PathVariable String code) {
        List<Resident> apartmentResidents = residentRepository.findByApartment_Code(code);
        List<Map<String, Object>> response = new ArrayList<>();
        for (Resident resident : apartmentResidents) {
            response.add(toResidentResponse(resident));
        }
        return response;
    }

    private Map<String, Object> toBuildingSummary(Building building) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("id", building.getCode());
        summary.put("name", building.getName());
        summary.put("floors", building.getFloors());
        summary.put("apartments", apartmentRepository.findByBuilding_Code(building.getCode()).size());
        summary.put("residents", residentRepository.countByApartment_Building_Code(building.getCode()));
        return summary;
    }

    private Map<String, Object> toBuildingDetail(Building building, List<Apartment> apartments) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("id", building.getCode());
        detail.put("name", building.getName());
        detail.put("floors", building.getFloors());
        detail.put("totalApartments", apartments.size());
        detail.put("occupied", apartments.stream().filter(apartment -> apartment.getStatus() == ApartmentStatus.OCCUPIED).count());
        detail.put("vacant", apartments.stream().filter(apartment -> apartment.getStatus() == ApartmentStatus.EMPTY).count());

        List<Map<String, Object>> apartmentRows = new ArrayList<>();
        for (Apartment apartment : apartments) {
            Map<String, Object> apartmentRow = new HashMap<>();
            apartmentRow.put("code", apartment.getCode());
            apartmentRow.put("owner", residentRepository.findOwnerNameByApartmentCode(apartment.getCode()));
            apartmentRow.put("people", residentRepository.countByApartmentCode(apartment.getCode()));
            apartmentRow.put("status", apartment.getStatus() != null ? apartment.getStatus().name() : null);
            apartmentRows.add(apartmentRow);
        }
        detail.put("apartments", apartmentRows);
        return detail;
    }

    private Map<String, Object> emptyBuildingDetail(String buildingId) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("id", buildingId);
        detail.put("name", "Tòa " + buildingId);
        detail.put("floors", 0);
        detail.put("totalApartments", 0);
        detail.put("occupied", 0);
        detail.put("vacant", 0);
        detail.put("apartments", Collections.emptyList());
        return detail;
    }

    private Map<String, Object> toResidentResponse(Resident resident) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", resident.getId());
        response.put("name", resident.getName());
        response.put("gender", resident.getGender() != null ? resident.getGender().name() : null);
        response.put("dob", resident.getDob());
        response.put("age", resident.getAge());
        response.put("cccd", resident.getCccd());
        response.put("phone", resident.getPhone());
        response.put("relationship", resident.getRelationship() != null ? resident.getRelationship().name() : null);
        response.put("status", resident.getStatus() != null ? resident.getStatus().name() : null);
        response.put("householdId", resident.getHouseholdId());
        return response;
    }
}
