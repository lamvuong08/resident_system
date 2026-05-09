package com.dancu.qlydancu.service;

import com.dancu.qlydancu.model.ResidenceRecord;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.enums.OccupancyStatus;
import com.dancu.qlydancu.model.enums.ResidenceRecordStatus;
import com.dancu.qlydancu.model.enums.ResidenceRecordType;
import com.dancu.qlydancu.model.enums.ResidentCategory;
import com.dancu.qlydancu.model.enums.ResidentRelationship;
import com.dancu.qlydancu.repo.ResidenceRecordRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class ResidenceRecordDecisionService {

    private static final Logger log = LoggerFactory.getLogger(ResidenceRecordDecisionService.class);

    private final ResidenceRecordRepository residenceRecordRepository;
    private final ResidentRepository residentRepository;

    public ResidenceRecordDecisionService(ResidenceRecordRepository residenceRecordRepository,
                                         ResidentRepository residentRepository) {
        this.residenceRecordRepository = residenceRecordRepository;
        this.residentRepository = residentRepository;
    }

    @Transactional
    public ResidenceRecordStatus decide(Long id, String action) {
        ResidenceRecord record = residenceRecordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay ho so cu tru"));

        ResidenceRecordStatus targetStatus = resolveTargetStatus(action);
        record.setStatus(targetStatus);
        log.info("Saving residence record decision flow id={} status={}", record.getId(), record.getStatus() != null ? record.getStatus().name() : null);
        residenceRecordRepository.save(record);

        if (targetStatus == ResidenceRecordStatus.APPROVED) {
            applyApproveEffect(record);
        }

        return targetStatus;
    }

    private ResidenceRecordStatus resolveTargetStatus(String action) {
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("action la bat buoc");
        }

        String normalized = action.trim().toUpperCase();
        if ("APPROVE".equals(normalized)) {
            return ResidenceRecordStatus.APPROVED;
        }
        if ("REJECT".equals(normalized)) {
            return ResidenceRecordStatus.REJECTED;
        }

        throw new IllegalArgumentException("action khong hop le. Chi chap nhan APPROVE hoac REJECT");
    }

    private void applyApproveEffect(ResidenceRecord record) {
        if (record.getType() == ResidenceRecordType.TEMPORARY_STAY) {
            handleTemporaryStayApproval(record);
            return;
        }

        if (record.getType() == ResidenceRecordType.TEMPORARY_ABSENCE) {
            handleTemporaryAbsenceApproval(record);
        }
    }

    private void handleTemporaryStayApproval(ResidenceRecord record) {
        if (record.getHouseholdId() == null) {
            throw new IllegalArgumentException("Ho so tam tru khong co household_id");
        }

        Resident guest = resolveGuestResident(record).orElseGet(Resident::new);
        if (guest.getRelationship() == null) {
            guest.setRelationship(ResidentRelationship.OTHER);
        }

        guest.setHouseholdId(record.getHouseholdId());
        guest.setResidentCategory(ResidentCategory.TEMPORARY);
        guest.setOccupancyStatus(OccupancyStatus.LIVING);

        String guestName = normalize(record.getGuestName());
        if (guestName != null) {
            guest.setName(guestName);
        } else if (normalize(guest.getName()) == null) {
            guest.setName("Khach tam tru");
        }

        String guestCccd = normalize(record.getGuestCccd());
        if (guestCccd != null) {
            guest.setCccd(guestCccd);
        }

        String guestPhone = normalize(record.getGuestPhone());
        if (guestPhone != null) {
            guest.setPhone(guestPhone);
        }

        residentRepository.save(guest);
    }

    private Optional<Resident> resolveGuestResident(ResidenceRecord record) {
        String guestCccd = normalize(record.getGuestCccd());
        if (guestCccd != null) {
            Optional<Resident> byCccd = residentRepository.findByCccd(guestCccd);
            if (byCccd.isPresent()) {
                return byCccd;
            }
        }

        String guestName = normalize(record.getGuestName());
        String guestPhone = normalize(record.getGuestPhone());
        if (record.getHouseholdId() == null || guestName == null) {
            return Optional.empty();
        }

        if (guestPhone != null) {
            Optional<Resident> byNameAndPhone = residentRepository
                    .findFirstByHouseholdIdAndNameIgnoreCaseAndPhone(record.getHouseholdId(), guestName, guestPhone);
            if (byNameAndPhone.isPresent()) {
                return byNameAndPhone;
            }
        }

        return residentRepository.findFirstByHouseholdIdAndNameIgnoreCase(record.getHouseholdId(), guestName);
    }

    private void handleTemporaryAbsenceApproval(ResidenceRecord record) {
        Resident resident = record.getResident();
        if (resident == null) {
            throw new IllegalArgumentException("Ho so tam vang khong co resident lien quan");
        }

        resident.setOccupancyStatus(OccupancyStatus.TEMP_ABSENT);
        if (resident.getResidentCategory() == null) {
            resident.setResidentCategory(ResidentCategory.OFFICIAL);
        }

        residentRepository.save(resident);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
