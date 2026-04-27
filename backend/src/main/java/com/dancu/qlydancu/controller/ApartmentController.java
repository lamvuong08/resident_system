package com.dancu.qlydancu.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    public ResponseEntity<List<ApartmentResponse>> filterApartments(
            @RequestParam String buildingId, // Đổi từ Long sang String để hứng cả ID lẫn Mã tòa
            @RequestParam(required = false) Integer floor) {

        List<Apartment> apartments = new ArrayList<>();
        
        try {
            // Trường hợp 1: Frontend gửi lên dạng số (ID = "1", "2")
            Long bId = Long.parseLong(buildingId);
            if (floor != null) {
                apartments = apartmentRepository.findByBuildingIdAndFloorNumber(bId, floor);
            } else {
                apartments = apartmentRepository.findByBuildingId(bId);
            }
        } catch (NumberFormatException ex) {
            // Trường hợp 2: Frontend gửi lên dạng chữ (Code = "A1", "A2") -> Ép kiểu Long thất bại sẽ nhảy vào đây
            if (floor != null) {
                apartments = apartmentRepository.findByBuilding_CodeAndFloorNumber(buildingId, floor);
            } else {
                apartments = apartmentRepository.findByBuilding_Code(buildingId); // Hàm này có sẵn trong Repo của bạn
            }
        }

        // Sử dụng hàm toApartmentResponse (đã có sẵn trong file của bạn) để map DTO.
        // Việc dùng toApartmentResponse giúp lấy được thông tin Chủ hộ, Số người và tránh lỗi 500 Lazy Load.
        List<ApartmentResponse> response = apartments.stream()
                .map(this::toApartmentResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
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
        // 1. Sử dụng Constructor đã có (tự động map id, code, floor, area, status,
        // building info)
        ApartmentResponse apartmentResponse = new ApartmentResponse(apartment);

        // 2. Bổ sung các thông tin mà Entity Apartment không có sẵn (phải truy vấn từ
        // Repo khác)
        // Lấy tên chủ hộ
        apartmentResponse.ownerName = residentRepository.findOwnerNameByApartmentCode(apartment.getCode());

        // Đếm số thành viên
        apartmentResponse.peopleCount = (int) residentRepository.countByApartmentCode(apartment.getCode());

        // Tìm householdId (vì Apartment không có liên kết tới Household)
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

    // public ResponseEntity<List<ApartmentResponse>> getApartmentsByBuildingAndFloor(
    //         @PathVariable Long buildingId,
    //         @PathVariable Integer floorNumber) {

    //     List<Apartment> apartments = apartmentRepository.findByBuildingIdAndFloorNumber(buildingId, floorNumber);

    //     List<ApartmentResponse> response = apartments.stream()
    //             .map(ApartmentResponse::new)
    //             .collect(Collectors.toList());

    //     return ResponseEntity.ok(response);
    // }
}
