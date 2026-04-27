package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.dto.ResidenceRecordCreateRequest;
import com.dancu.qlydancu.dto.ResidenceRecordDecisionRequest;
import com.dancu.qlydancu.dto.ResidenceRecordRowResponse;
import com.dancu.qlydancu.model.ResidenceRecord;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.enums.ResidenceRecordStatus;
import com.dancu.qlydancu.model.enums.ResidenceRecordType;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.ResidenceRecordRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import com.dancu.qlydancu.repo.projection.ResidenceRecordRowProjection;
import com.dancu.qlydancu.service.ResidenceRecordDecisionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/residence-records")
public class ResidenceRecordController {

    private final ResidenceRecordRepository residenceRecordRepository;
    private final ResidenceRecordDecisionService residenceRecordDecisionService;
    private final ResidentRepository residentRepository;
    private final HouseholdRepository householdRepository;

    public ResidenceRecordController(ResidenceRecordRepository residenceRecordRepository,
                                     ResidenceRecordDecisionService residenceRecordDecisionService,
                                     ResidentRepository residentRepository,
                                     HouseholdRepository householdRepository) {
        this.residenceRecordRepository = residenceRecordRepository;
        this.residenceRecordDecisionService = residenceRecordDecisionService;
        this.residentRepository = residentRepository;
        this.householdRepository = householdRepository;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody ResidenceRecordCreateRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Du lieu khong hop le"));
        }

        ResidenceRecordType type = parseType(request.type);
        if (type == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "type la bat buoc va phai hop le"));
        }

        if (request.startDate == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "startDate la bat buoc"));
        }

        ResidenceRecord record = new ResidenceRecord();
        record.setType(type);
        record.setStatus(ResidenceRecordStatus.PENDING);
        record.setStartDate(request.startDate);
        record.setEndDate(request.endDate);
        record.setReason(normalizeTextParam(request.reason));

        if (type == ResidenceRecordType.TEMPORARY_STAY) {
            return createTemporaryStay(record, request);
        }

        return createTemporaryAbsence(record, request);
    }

    @GetMapping
    public List<ResidenceRecordRowResponse> list(
            @RequestParam(required = false) String buildingCode,
            @RequestParam(required = false) String apartmentCode,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        String normalizedType = normalizeEnumParam(type);
        String normalizedStatus = normalizeEnumParam(status);
        String normalizedKeyword = normalizeKeyword(keyword);

        if (normalizedType != null) {
            validateType(normalizedType);
        }
        if (normalizedStatus != null) {
            validateStatus(normalizedStatus);
        }

        List<ResidenceRecordRowProjection> rows = residenceRecordRepository.findResidenceRows(
                normalizeTextParam(buildingCode),
                normalizeTextParam(apartmentCode),
                normalizedType,
                normalizedStatus,
                fromDate,
                toDate,
                normalizedKeyword
        );

        return rows.stream().map(this::toRowResponse).toList();
    }

    @PatchMapping("/{id}/decision")
    public ResponseEntity<Map<String, Object>> decide(
            @PathVariable Long id,
            @RequestBody ResidenceRecordDecisionRequest request
    ) {
        if (id == null || id <= 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "id khong hop le"
            ));
        }

        if (request == null || normalizeTextParam(request.action) == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "action la bat buoc"
            ));
        }

        try {
            ResidenceRecordStatus targetStatus = residenceRecordDecisionService.decide(id, request.action);
            return ResponseEntity.ok(Map.of(
                    "id", id,
                    "status", targetStatus.name(),
                    "message", "Cap nhat trang thai thanh cong"
            ));
        } catch (IllegalArgumentException ex) {
            String message = ex.getMessage() == null ? "Du lieu khong hop le" : ex.getMessage();
            if (message.toLowerCase().contains("khong tim thay")) {
                return ResponseEntity.status(404).body(Map.of("message", message));
            }
            return ResponseEntity.badRequest().body(Map.of("message", message));
        }
    }

    private ResponseEntity<Map<String, Object>> createTemporaryStay(ResidenceRecord record, ResidenceRecordCreateRequest request) {
        Long householdId = request.householdId;
        if (householdId == null || householdId <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "householdId la bat buoc cho ho so tam tru"));
        }

        if (householdRepository.findById(householdId).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "householdId khong ton tai"));
        }

        String guestName = normalizeTextParam(request.guestName);
        if (guestName == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "guestName la bat buoc cho ho so tam tru"));
        }

        record.setHouseholdId(householdId);
        record.setGuestName(guestName);
        record.setGuestCccd(normalizeTextParam(request.guestCccd));
        record.setGuestPhone(normalizeTextParam(request.guestPhone));
        residenceRecordRepository.save(record);

        return ResponseEntity.status(201).body(toCreateResponse(record, "Ho so tam tru da duoc tao"));
    }

    private ResponseEntity<Map<String, Object>> createTemporaryAbsence(ResidenceRecord record, ResidenceRecordCreateRequest request) {
        Long residentId = request.residentId;
        if (residentId == null || residentId <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "residentId la bat buoc cho ho so tam vang"));
        }

        Resident resident = residentRepository.findById(residentId).orElse(null);
        if (resident == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Khong tim thay resident"));
        }

        if (resident.getHouseholdId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "resident khong co householdId hop le"));
        }

        record.setResident(resident);
        record.setHouseholdId(resident.getHouseholdId());
        residenceRecordRepository.save(record);

        return ResponseEntity.status(201).body(toCreateResponse(record, "Ho so tam vang da duoc tao"));
    }

    private ResidenceRecordRowResponse toRowResponse(ResidenceRecordRowProjection source) {
        ResidenceRecordRowResponse row = new ResidenceRecordRowResponse();
        row.id = source.getId();
        row.recordCode = source.getRecordCode();
        row.residentId = source.getResidentId();
        row.residentName = source.getResidentName();
        row.submittedByName = source.getSubmittedByName();
        row.relatedPersonName = source.getRelatedPersonName();
        row.cccd = source.getCccd();
        row.buildingCode = source.getBuildingCode();
        row.buildingName = source.getBuildingName();
        row.apartmentCode = source.getApartmentCode();
        row.floorNumber = source.getFloorNumber();
        row.roomNumber = source.getRoomNumber();
        row.headOfHouseholdName = source.getHeadOfHouseholdName();
        row.type = source.getType();
        row.status = source.getStatus();
        row.reason = source.getReason();
        row.guestName = source.getGuestName();
        row.guestCccd = source.getGuestCccd();
        row.guestPhone = source.getGuestPhone();
        row.startDate = source.getStartDate();
        row.endDate = source.getEndDate();
        return row;
    }

    private String normalizeTextParam(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeKeyword(String value) {
        String normalized = normalizeTextParam(value);
        if (normalized == null) {
            return null;
        }
        return normalized.toLowerCase();
    }

    private String normalizeEnumParam(String value) {
        String normalized = normalizeTextParam(value);
        if (normalized == null) {
            return null;
        }
        return normalized.toUpperCase();
    }

    private void validateType(String type) {
        if (!"TEMPORARY_STAY".equals(type) && !"TEMPORARY_ABSENCE".equals(type)) {
            throw new IllegalArgumentException("type khong hop le");
        }
    }

    private ResidenceRecordType parseType(String value) {
        String normalized = normalizeTextParam(value);
        if (normalized == null) {
            return null;
        }

        String upper = normalized.toUpperCase();
        if ("TEMPORARY_STAY".equals(upper)) {
            return ResidenceRecordType.TEMPORARY_STAY;
        }
        if ("TEMPORARY_ABSENCE".equals(upper)) {
            return ResidenceRecordType.TEMPORARY_ABSENCE;
        }
        return null;
    }

    private Map<String, Object> toCreateResponse(ResidenceRecord record, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", record.getId());
        response.put("type", record.getType() != null ? record.getType().name() : null);
        response.put("status", record.getStatus() != null ? record.getStatus().name() : null);
        response.put("message", message);
        return response;
    }

    private void validateStatus(String status) {
        if (!"PENDING".equals(status) && !"APPROVED".equals(status) && !"REJECTED".equals(status)) {
            throw new IllegalArgumentException("status khong hop le");
        }
    }
}
