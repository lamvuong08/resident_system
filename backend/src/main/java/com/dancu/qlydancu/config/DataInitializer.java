package com.dancu.qlydancu.config;

import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.status.ApartmentStatus;
import com.dancu.qlydancu.model.Building;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.BuildingRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {
    private final BuildingRepository buildingRepository;
    private final ApartmentRepository apartmentRepository;
    private final ResidentRepository residentRepository;

    public DataInitializer(BuildingRepository buildingRepository, ApartmentRepository apartmentRepository, ResidentRepository residentRepository) {
        this.buildingRepository = buildingRepository;
        this.apartmentRepository = apartmentRepository;
        this.residentRepository = residentRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (buildingRepository.count() > 0) return;

        Building a1 = new Building("A1", "Tòa A1", 15);
        Building a2 = new Building("A2", "Tòa A2", 18);
        Building b1 = new Building("B1", "Tòa B1", 12);

        buildingRepository.save(a1);
        buildingRepository.save(a2);
        buildingRepository.save(b1);

        // create some apartments for A1
        List<Apartment> aps = new ArrayList<>();
        for (int f = 1; f <= 15; f++) {
            for (int s = 1; s <= 8; s++) {
                String code = String.format("A1-%02d%02d", f, s);
                Apartment ap = new Apartment(code, f, (s % 4 == 0) ? ApartmentStatus.VACANT : ApartmentStatus.OCCUPIED);
                ap.setOwnerName((s % 4 == 0) ? null : "Nguyễn Văn A");
                ap.setPeopleCount((s % 4 == 0) ? 0 : 3);
                ap.setBuilding(a1);
                aps.add(ap);
            }
        }
        apartmentRepository.saveAll(aps);

        // small set for A2
        List<Apartment> aps2 = new ArrayList<>();
        for (int f = 1; f <= 18; f++) {
            for (int s = 1; s <= 8; s++) {
                String code = String.format("A2-%02d%02d", f, s);
                Apartment ap = new Apartment(code, f, (s % 5 == 0) ? ApartmentStatus.VACANT : ApartmentStatus.OCCUPIED);
                ap.setOwnerName((s % 5 == 0) ? null : "Trần Thị B");
                ap.setPeopleCount((s % 5 == 0) ? 0 : 2);
                ap.setBuilding(a2);
                aps2.add(ap);
            }
        }
        apartmentRepository.saveAll(aps2);

        // small set for B1
        List<Apartment> aps3 = new ArrayList<>();
        for (int f = 1; f <= 12; f++) {
            for (int s = 1; s <= 8; s++) {
                String code = String.format("B1-%02d%02d", f, s);
                Apartment ap = new Apartment(code, f, (s % 3 == 0) ? ApartmentStatus.VACANT : ApartmentStatus.OCCUPIED);
                ap.setOwnerName((s % 3 == 0) ? null : "Phạm Văn C");
                ap.setPeopleCount((s % 3 == 0) ? 0 : 4);
                ap.setBuilding(b1);
                aps3.add(ap);
            }
        }
        apartmentRepository.saveAll(aps3);

        // create some residents linked to random apartments
        List<Resident> residents = new ArrayList<>();
        var allAps = apartmentRepository.findAll();
        int idx = 1;
        for (var ap : allAps) {
            if (ap.getStatus() == ApartmentStatus.OCCUPIED) {
                Resident r = new Resident("Cư dân " + idx);
                r.setApartment(ap);
                r.setAge(30);
                r.setPhone("09" + (10000000 + idx));
                residents.add(r);
                idx++;
                if (idx > 200) break;
            }
        }
        residentRepository.saveAll(residents);
    }
}
