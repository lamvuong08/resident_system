package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.dto.ApartmentResponse;
import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import com.dancu.qlydancu.repo.BillDetailRepository;
import com.dancu.qlydancu.repo.BillRepository;
import com.dancu.qlydancu.repo.PaymentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    public List<Apartment> list() {
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
        ApartmentResponse apartmentResponse = new ApartmentResponse();
        apartmentResponse.id = apartment.getId();
        apartmentResponse.code = apartment.getCode();
        apartmentResponse.floorNumber = apartment.getFloorNumber();
        apartmentResponse.roomNumber = apartment.getRoomNumber();
        apartmentResponse.area = apartment.getArea();
        apartmentResponse.status = apartment.getStatus() != null ? apartment.getStatus().name() : null;
        apartmentResponse.ownerName = residentRepository.findOwnerNameByApartmentCode(apartment.getCode());
        apartmentResponse.peopleCount = (int) residentRepository.countByApartmentCode(apartment.getCode());
        apartmentResponse.buildingCode = apartment.getBuilding() != null ? apartment.getBuilding().getCode() : null;
        apartmentResponse.buildingName = apartment.getBuilding() != null ? apartment.getBuilding().getName() : null;
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
