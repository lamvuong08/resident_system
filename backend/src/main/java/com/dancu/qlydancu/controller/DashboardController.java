package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.repo.BuildingRepository;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import com.dancu.qlydancu.model.status.ApartmentStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private ResidentRepository residentRepository;

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> m = new HashMap<>();
        m.put("totalBuildings", buildingRepository.count());
        m.put("totalApartments", apartmentRepository.count());
        m.put("occupiedApartments", apartmentRepository.countByStatus(ApartmentStatus.OCCUPIED));
        m.put("vacantApartments", apartmentRepository.countByStatus(ApartmentStatus.VACANT));
        m.put("totalResidents", residentRepository.count());
        m.put("pendingRequests", 12);
        return m;
    }

    @GetMapping("/buildings")
    public List<Map<String, Object>> buildings() {
        List<Map<String, Object>> list = new ArrayList<>();
        buildingRepository.findAll().forEach(b -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", b.getCode());
            m.put("name", b.getName());
            m.put("floors", b.getFloors());
            m.put("apartments", b.getApartments() != null ? b.getApartments().size() : apartmentRepository.findByBuilding_Code(b.getCode()).size());
            m.put("residents", residentRepository.countByApartment_Building_Code(b.getCode()));
            list.add(m);
        });
        return list;
    }

    @GetMapping("/buildings/{id}")
    public Map<String, Object> buildingDetail(@PathVariable String id) {
        Map<String, Object> d = new HashMap<>();
        BuildingRepository br = null; // dummy to keep imports clean
        // attempt to find building by code
        BuildingRepository finalBr = br;
        // find building entity
        var buildingEntity = buildingRepository.findByCode(id);
        if (buildingEntity != null) {
            d.put("id", buildingEntity.getCode());
            d.put("name", buildingEntity.getName());
            d.put("floors", buildingEntity.getFloors());
            var aps = apartmentRepository.findByBuilding_Code(buildingEntity.getCode());
            d.put("totalApartments", aps.size());
            long occupied = aps.stream().filter(a -> a.getStatus() == ApartmentStatus.OCCUPIED).count();
            long vacant = aps.stream().filter(a -> a.getStatus() == ApartmentStatus.VACANT).count();
            d.put("occupied", occupied);
            d.put("vacant", vacant);
            List<Map<String, Object>> apList = new ArrayList<>();
            for (var a : aps) {
                Map<String, Object> ap = new HashMap<>();
                ap.put("code", a.getCode());
                ap.put("owner", a.getOwnerName());
                ap.put("people", a.getPeopleCount());
                ap.put("status", a.getStatus() != null ? a.getStatus().name() : null);
                apList.add(ap);
            }
            d.put("apartments", apList);
        } else {
            d.put("id", id);
            d.put("name", "Tòa " + id);
            d.put("floors", 0);
            d.put("totalApartments", 0);
            d.put("occupied", 0);
            d.put("vacant", 0);
            d.put("apartments", Collections.emptyList());
        }

        return d;
    }

    @GetMapping("/apartments/{code}/residents")
    public List<Map<String, Object>> apartmentResidents(@PathVariable String code) {
        var res = residentRepository.findByApartment_Code(code);
        List<Map<String, Object>> out = new ArrayList<>();
        for (var r : res) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("name", r.getName());
            m.put("age", r.getAge());
            m.put("phone", r.getPhone());
            out.add(m);
        }
        return out;
    }
}
