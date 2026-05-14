package com.dancu.qlydancu.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.ApartmentResponse;
import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.BillDetailRepository;
import com.dancu.qlydancu.repo.BillRepository;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.PaymentRepository;
import com.dancu.qlydancu.repo.ResidentRepository;

@RestController
@RequestMapping("/api/apartments")
public class ApartmentController {
    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final BillRepository billRepository;
    private final BillDetailRepository billDetailRepository;
    private final PaymentRepository paymentRepository;

    public ApartmentController(ApartmentRepository apartmentRepository,
            HouseholdRepository householdRepository,
            ResidentRepository residentRepository,
            BillRepository billRepository,
            BillDetailRepository billDetailRepository,
            PaymentRepository paymentRepository) {
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
        this.residentRepository = residentRepository;
        this.billRepository = billRepository;
        this.billDetailRepository = billDetailRepository;
        this.paymentRepository = paymentRepository;
    }

    @GetMapping
    public List<Apartment> list(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String buildingCode
    ) {
        if (buildingId != null) {
            return apartmentRepository.findByBuilding_Id(buildingId);
        }

        if (buildingCode != null && !buildingCode.isBlank()) {
            return apartmentRepository.findByBuilding_Code(buildingCode.trim().toUpperCase());
        }

        return apartmentRepository.findAll();
    }

    @GetMapping("/filter")
    public List<Apartment> filter(
            @RequestParam(required = false) String buildingId,
            @RequestParam(required = false, name = "floor") Integer floor
    ) {
        if (buildingId != null && !buildingId.isBlank()) {
            try {
                Long id = Long.parseLong(buildingId);
                if (floor != null) {
                    return apartmentRepository.findByBuilding_IdAndFloorNumber(id, floor);
                } else {
                    return apartmentRepository.findByBuilding_Id(id);
                }
            } catch (NumberFormatException e) {
                if (floor != null) {
                    return apartmentRepository.findByBuilding_CodeAndFloorNumber(buildingId, floor);
                } else {
                    return apartmentRepository.findByBuilding_Code(buildingId);
                }
            }
        } else if (floor != null) {
            return apartmentRepository.findByFloorNumber(floor);
        }
        return apartmentRepository.findAll();
    }

    @GetMapping("/{idOrCode}")
    public ResponseEntity<ApartmentResponse> get(@PathVariable String idOrCode) {
        Apartment apartment = findApartmentByIdOrCode(idOrCode);
        if (apartment == null) {
            return ResponseEntity.notFound().build();
        }

        ApartmentResponse apartmentResponse = toApartmentResponse(apartment);
        return ResponseEntity.ok(apartmentResponse);
    }

    @GetMapping("/{idOrCode}/residents")
    public ResponseEntity<List<Resident>> getResidents(@PathVariable String idOrCode) {
        Apartment apartment = findApartmentByIdOrCode(idOrCode);
        if (apartment == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(residentRepository.findByApartment_Code(apartment.getCode()));
    }

    @PostMapping("/{idOrCode}/household")
    public ResponseEntity<Map<String, Object>> resolveHousehold(@PathVariable String idOrCode) {
        Apartment apartment = findApartmentByIdOrCode(idOrCode);
        if (apartment == null) {
            return ResponseEntity.notFound().build();
        }

        Household household = householdRepository.findByApartment_Code(apartment.getCode()).orElseGet(() -> {
            Household created = new Household();
            created.setApartment(apartment);
            return householdRepository.save(created);
        });

        return ResponseEntity.ok(toHouseholdResponse(household, apartment));
    }

    @GetMapping("/{idOrCode}/finances")
    public List<BillDetail> getFinances(@PathVariable String idOrCode) {
        Long apartmentId = resolveApartmentId(idOrCode);
        if (apartmentId == null) {
            return List.of();
        }

        List<BillDetail> billDetails = new ArrayList<>();
        for (Bill bill : billRepository.findByApartment_Id(apartmentId)) {
            billDetails.addAll(billDetailRepository.findByBill_Id(bill.getId()));
        }
        return billDetails;
    }

    @GetMapping("/{idOrCode}/payments")
    public List<Payment> getPayments(@PathVariable String idOrCode) {
        Long apartmentId = resolveApartmentId(idOrCode);
        if (apartmentId == null) {
            return List.of();
        }
        return paymentRepository.findByApartmentId(apartmentId);
    }

    private Long resolveApartmentId(String idOrCode) {
        try {
            return Long.parseLong(idOrCode);
        } catch (NumberFormatException ex) {
            var opt = apartmentRepository.findByCode(idOrCode);
            return opt.map(Apartment::getId).orElse(null);
        }
    }

    private Apartment findApartmentByIdOrCode(String idOrCode) {
        return apartmentRepository.findByCode(idOrCode).orElseGet(() -> {
            try {
                Long id = Long.parseLong(idOrCode);
                return apartmentRepository.findById(id).orElse(null);
            } catch (NumberFormatException ex) {
                return null;
            }
        });
    }

    private ApartmentResponse toApartmentResponse(Apartment apartment) {
        ApartmentResponse apartmentResponse = new ApartmentResponse(apartment);
        apartmentResponse.ownerName = residentRepository.findOwnerNameByApartmentCode(apartment.getCode());
        apartmentResponse.peopleCount = (int) residentRepository.countByApartmentCode(apartment.getCode());
        apartmentResponse.householdId = householdRepository.findByApartment_Code(apartment.getCode())
                .map(Household::getId)
                .orElse(null);

        return apartmentResponse;
    }

    private Map<String, Object> toHouseholdResponse(Household household, Apartment apartment) {
        Map<String, Object> response = new HashMap<>();
        response.put("householdId", household.getId());
        response.put("apartmentCode", apartment.getCode());
        return response;
    }
}
