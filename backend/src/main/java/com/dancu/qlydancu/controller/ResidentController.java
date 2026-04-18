package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public List<Resident> list() {
        return residentRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resident> get(@PathVariable Long id) {
        return residentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Resident> create(@RequestBody Resident resident) {
        validateResidentPayload(resident);
        Resident savedResident = residentRepository.save(resident);
        return ResponseEntity.ok(savedResident);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Resident> update(@PathVariable Long id, @RequestBody Resident resident) {
        if (!residentExists(id)) {
            return ResponseEntity.notFound().build();
        }

        resident.setId(id);
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
}
