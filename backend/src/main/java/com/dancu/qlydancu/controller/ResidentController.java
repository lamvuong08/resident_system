package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.enums.OccupancyStatus;
import com.dancu.qlydancu.model.enums.ResidentCategory;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import com.dancu.qlydancu.repo.projection.ResidentAdminRowProjection;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/residents")
public class ResidentController {
    private final ResidentRepository residentRepository;
    private final HouseholdRepository householdRepository;

    public ResidentController(ResidentRepository residentRepository, HouseholdRepository householdRepository) {
        this.residentRepository = residentRepository;
        this.householdRepository = householdRepository;
    }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String view,
            @RequestParam(required = false) String buildingCode,
            @RequestParam(required = false) String apartmentCode,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean includeHistory
    ) {
        ResidentFilter filter = resolveViewFilter(view);
        boolean includeExpiredTemporary = includeHistory || filter.includeExpiredTemporary;

        List<ResidentAdminRowProjection> rows = residentRepository.searchResidentAdminRows(
                normalizeText(buildingCode),
                normalizeText(apartmentCode),
                normalizeText(keyword),
                filter.occupancyStatus,
                filter.residentCategory,
                includeExpiredTemporary
        );

        return rows.stream().map(this::toResidentListRow).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resident> get(@PathVariable Long id) {
        return residentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Resident> create(@RequestBody Resident resident) {
        if (resident.getResidentCategory() == ResidentCategory.TEMPORARY) {
            return ResponseEntity.badRequest().build();
        }

        applyDefaults(resident);
        resident.setResidentCategory(ResidentCategory.OFFICIAL);
        resident.setOccupancyStatus(OccupancyStatus.LIVING);
        validateResidentPayload(resident);
        Resident savedResident = residentRepository.save(resident);
        return ResponseEntity.ok(savedResident);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Resident> update(@PathVariable Long id, @RequestBody Resident resident) {
        Resident existingResident = residentRepository.findById(id).orElse(null);
        if (existingResident == null) {
            return ResponseEntity.notFound().build();
        }

        resident.setId(id);
        resident.setResidentCategory(existingResident.getResidentCategory() != null
                ? existingResident.getResidentCategory()
                : ResidentCategory.OFFICIAL);
        resident.setOccupancyStatus(existingResident.getOccupancyStatus() != null
                ? existingResident.getOccupancyStatus()
                : OccupancyStatus.LIVING);
        validateResidentPayload(resident);
        Resident updatedResident = residentRepository.save(resident);
        return ResponseEntity.ok(updatedResident);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!residentExists(id)) {
            return ResponseEntity.notFound().build();
        }
        residentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private boolean residentExists(Long residentId) {
        return residentRepository.findById(residentId).isPresent();
    }

    private void validateResidentPayload(Resident resident) {
        if (resident.getName() == null || resident.getName().isBlank()) {
            throw new IllegalArgumentException("Tên cư dân không được để trống");
        }
        if (resident.getHouseholdId() == null) {
            throw new IllegalArgumentException("householdId là bắt buộc");
        }
        if (householdRepository.findById(resident.getHouseholdId()).isEmpty()) {
            throw new IllegalArgumentException("householdId không tồn tại");
        }
    }

    private void applyDefaults(Resident resident) {
        if (resident.getResidentCategory() == null) {
            resident.setResidentCategory(ResidentCategory.OFFICIAL);
        }
        if (resident.getOccupancyStatus() == null) {
            resident.setOccupancyStatus(OccupancyStatus.LIVING);
        }
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Map<String, Object> toResidentListRow(ResidentAdminRowProjection row) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", row.getId());
        response.put("name", row.getFullName());
        response.put("fullName", row.getFullName());
        response.put("dob", row.getDob());
        response.put("cccd", row.getCccd());
        response.put("phone", row.getPhone());
        response.put("relationship", row.getRelationship());
        response.put("residentCategory", row.getResidentCategory());
        response.put("occupancyStatus", row.getOccupancyStatus());
        response.put("status", row.getOccupancyStatus());
        response.put("householdId", row.getHouseholdId());
        response.put("apartmentCode", row.getApartmentCode());
        response.put("buildingCode", row.getBuildingCode());
        return response;
    }

    private ResidentFilter resolveViewFilter(String view) {
        if (view == null || view.isBlank()) {
            return new ResidentFilter(null, null, false);
        }

        String normalized = view.trim().toUpperCase();
        return switch (normalized) {
            case "LIVING" -> new ResidentFilter(OccupancyStatus.LIVING.name(), null, false);
            case "TEMP_ABSENT" -> new ResidentFilter(OccupancyStatus.TEMP_ABSENT.name(), null, false);
            case "TEMPORARY" -> new ResidentFilter(OccupancyStatus.LIVING.name(), ResidentCategory.TEMPORARY.name(), false);
            case "EXPIRED" -> new ResidentFilter(OccupancyStatus.EXPIRED.name(), null, true);
            case "ALL" -> new ResidentFilter(null, null, false);
            default -> throw new IllegalArgumentException("view filter khong hop le");
        };
    }

    private record ResidentFilter(String occupancyStatus, String residentCategory, boolean includeExpiredTemporary) {
    }
}
