package com.dancu.qlydancu.service;

import com.dancu.qlydancu.model.ResidenceRecord;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.enums.OccupancyStatus;
import com.dancu.qlydancu.model.enums.ResidenceRecordStatus;
import com.dancu.qlydancu.model.enums.ResidenceRecordType;
import com.dancu.qlydancu.model.enums.ResidentCategory;
import com.dancu.qlydancu.repo.ResidenceRecordRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Component
public class ResidenceStatusScheduler {

    private final ResidenceRecordRepository residenceRecordRepository;
    private final ResidentRepository residentRepository;

    public ResidenceStatusScheduler(ResidenceRecordRepository residenceRecordRepository,
                                    ResidentRepository residentRepository) {
        this.residenceRecordRepository = residenceRecordRepository;
        this.residentRepository = residentRepository;
    }

    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void syncExpiredResidenceStatuses() {
        LocalDate today = LocalDate.now();

        for (ResidenceRecord stayRecord : residenceRecordRepository.findByTypeAndStatusAndEndDateBefore(
                ResidenceRecordType.TEMPORARY_STAY,
                ResidenceRecordStatus.APPROVED,
                today
        )) {
            expireTemporaryStay(stayRecord);
        }

        for (ResidenceRecord absenceRecord : residenceRecordRepository.findByTypeAndStatusAndEndDateBefore(
                ResidenceRecordType.TEMPORARY_ABSENCE,
                ResidenceRecordStatus.APPROVED,
                today
        )) {
            restoreTemporaryAbsence(absenceRecord);
        }
    }

    private void expireTemporaryStay(ResidenceRecord record) {
        Optional<Resident> maybeGuest = findTemporaryGuest(record);
        if (maybeGuest.isEmpty()) {
            return;
        }

        Resident guest = maybeGuest.get();
        if (guest.getOccupancyStatus() == OccupancyStatus.EXPIRED) {
            return;
        }

        guest.setResidentCategory(ResidentCategory.TEMPORARY);
        guest.setOccupancyStatus(OccupancyStatus.EXPIRED);
        residentRepository.save(guest);
    }

    private Optional<Resident> findTemporaryGuest(ResidenceRecord record) {
        String guestCccd = normalize(record.getGuestCccd());
        if (guestCccd != null) {
            return residentRepository.findByCccd(guestCccd);
        }

        String guestName = normalize(record.getGuestName());
        if (record.getHouseholdId() == null || guestName == null) {
            return Optional.empty();
        }

        String guestPhone = normalize(record.getGuestPhone());
        if (guestPhone != null) {
            Optional<Resident> byNameAndPhone = residentRepository
                    .findFirstByHouseholdIdAndNameIgnoreCaseAndPhone(record.getHouseholdId(), guestName, guestPhone);
            if (byNameAndPhone.isPresent()) {
                return byNameAndPhone;
            }
        }

        return residentRepository.findFirstByHouseholdIdAndNameIgnoreCase(record.getHouseholdId(), guestName);
    }

    private void restoreTemporaryAbsence(ResidenceRecord record) {
        Resident resident = record.getResident();
        if (resident == null) {
            return;
        }

        if (resident.getOccupancyStatus() != OccupancyStatus.TEMP_ABSENT) {
            return;
        }

        resident.setOccupancyStatus(OccupancyStatus.LIVING);
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
