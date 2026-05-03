package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.MaintenanceRequest;
import com.dancu.qlydancu.model.Notification;
import com.dancu.qlydancu.model.NotificationReceiver;
import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.enums.OccupancyStatus;
import com.dancu.qlydancu.model.enums.ResidentCategory;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.MaintenanceRequestRepository;
import com.dancu.qlydancu.repo.NotificationReceiverRepository;
import com.dancu.qlydancu.repo.PaymentRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/households")
public class HouseholdController {

    private static final Logger logger = LoggerFactory.getLogger(HouseholdController.class);

    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final PaymentRepository paymentRepository;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final NotificationReceiverRepository notificationReceiverRepository;

    public HouseholdController(HouseholdRepository householdRepository,
                               ResidentRepository residentRepository,
                               PaymentRepository paymentRepository,
                               MaintenanceRequestRepository maintenanceRequestRepository,
                               NotificationReceiverRepository notificationReceiverRepository) {
        this.householdRepository = householdRepository;
        this.residentRepository = residentRepository;
        this.paymentRepository = paymentRepository;
        this.maintenanceRequestRepository = maintenanceRequestRepository;
        this.notificationReceiverRepository = notificationReceiverRepository;
    }

    @GetMapping("/me/summary")
    public ResponseEntity<?> getMyHouseholdSummary(Authentication authentication) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }

            Household household = findCurrentHousehold(authentication);
            if (household == null) {
                return ResponseEntity.status(404).body("No household found");
            }
            if (household.getApartment() == null) {
                return ResponseEntity.status(404).body("Household apartment not found");
            }

            List<Resident> householdResidents = residentRepository.findByHouseholdId(household.getId());
            return ResponseEntity.ok(toHouseholdSummary(household, householdResidents));
        } catch (Exception e) {
            logger.error("Error in /households/me/summary", e);
            return ResponseEntity.status(500).body("Internal server error");
        }
    }

    @GetMapping("/me/residents")
    public ResponseEntity<List<Map<String, Object>>> getMyHouseholdResidents(Authentication authentication) {
        Household household = findCurrentHousehold(authentication);
        if (household == null) {
            return ResponseEntity.notFound().build();
        }

        List<Resident> householdResidents = residentRepository.findByHouseholdId(household.getId());
        List<Map<String, Object>> response = new ArrayList<>();
        for (Resident resident : householdResidents) {
            response.add(toResidentResponse(resident));
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/me/residents")
    public ResponseEntity<?> createMyResident(@RequestBody Resident resident, Authentication authentication) {
        Household household = findCurrentHousehold(authentication);
        if (household == null) {
            return ResponseEntity.notFound().build();
        }
        if (resident.getResidentCategory() == ResidentCategory.TEMPORARY) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không thể tạo cư dân tạm trú qua kênh này"));
        }
        try {
            resident.setHouseholdId(household.getId());
            resident.setResidentCategory(ResidentCategory.OFFICIAL);
            resident.setOccupancyStatus(OccupancyStatus.LIVING);
            validateMyResidentPayload(resident);
            Resident saved = residentRepository.save(resident);
            return ResponseEntity.ok(toResidentResponse(saved));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/me/residents/{id}")
    public ResponseEntity<?> updateMyResident(@PathVariable Long id, @RequestBody Resident resident, Authentication authentication) {
        Household household = findCurrentHousehold(authentication);
        if (household == null) {
            return ResponseEntity.notFound().build();
        }
        Resident existing = residentRepository.findById(id).orElse(null);
        if (existing == null || !household.getId().equals(existing.getHouseholdId())) {
            return ResponseEntity.notFound().build();
        }
        resident.setId(id);
        resident.setHouseholdId(household.getId());
        resident.setResidentCategory(existing.getResidentCategory() != null
                ? existing.getResidentCategory()
                : ResidentCategory.OFFICIAL);
        resident.setOccupancyStatus(existing.getOccupancyStatus() != null
                ? existing.getOccupancyStatus()
                : OccupancyStatus.LIVING);
        try {
            validateMyResidentPayload(resident);
            Resident updated = residentRepository.save(resident);
            return ResponseEntity.ok(toResidentResponse(updated));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/me/payments")
    public ResponseEntity<List<Map<String, Object>>> getMyPayments(Authentication authentication) {
        Household household = findCurrentHousehold(authentication);
        if (household == null || household.getApartment() == null) {
            return ResponseEntity.notFound().build();
        }

        List<Payment> payments = paymentRepository.findByApartmentId(household.getApartment().getId());
        List<Map<String, Object>> response = new ArrayList<>();
        for (Payment payment : payments) {
            response.add(toPaymentResponse(payment));
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/requests")
    public ResponseEntity<List<Map<String, Object>>> getMyRequests(Authentication authentication) {
        Household household = findCurrentHousehold(authentication);
        if (household == null || household.getApartment() == null) {
            return ResponseEntity.notFound().build();
        }

        List<MaintenanceRequest> requests = maintenanceRequestRepository.findByApartmentId(household.getApartment().getId());
        List<Map<String, Object>> response = new ArrayList<>();
        for (MaintenanceRequest request : requests) {
            response.add(toRequestResponse(request));
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/notifications")
    public ResponseEntity<List<Map<String, Object>>> getMyNotifications(Authentication authentication) {
        Household household = findCurrentHousehold(authentication);
        if (household == null) {
            return ResponseEntity.notFound().build();
        }

        List<NotificationReceiver> receivers = notificationReceiverRepository.findByHousehold_Id(household.getId());
        List<Map<String, Object>> response = new ArrayList<>();
        for (NotificationReceiver receiver : receivers) {
            response.add(toNotificationResponse(receiver));
        }
        return ResponseEntity.ok(response);
    }

    private Household findCurrentHousehold(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return householdRepository.findByUser_Email(authentication.getName()).orElse(null);
    }

    private Map<String, Object> toHouseholdSummary(Household household, List<Resident> residents) {
        String apartmentCode = household.getApartment() != null ? household.getApartment().getCode() : null;
        String buildingName = household.getApartment() != null && household.getApartment().getBuilding() != null
            ? household.getApartment().getBuilding().getName()
            : null;
        Integer floorNumber = household.getApartment() != null ? household.getApartment().getFloorNumber() : null;
        java.math.BigDecimal area = household.getApartment() != null ? household.getApartment().getArea() : null;

        Map<String, Object> summary = new HashMap<>();
        summary.put("householdId", household.getId());
        summary.put("apartmentCode", apartmentCode);
        summary.put("buildingName", buildingName);
        summary.put("floorNumber", floorNumber);
        summary.put("area", area);
        summary.put("memberCount", residents.size());
        summary.put("ownerName", residents.stream()
                .filter(resident -> resident.getRelationship() != null && "HEAD".equals(resident.getRelationship().name()))
                .map(Resident::getName)
                .findFirst()
                .orElse(null));
        String apartmentStatus = household.getApartment() != null && household.getApartment().getStatus() != null
                ? household.getApartment().getStatus().name()
                : null;
        summary.put("apartmentStatus", apartmentStatus);

        return summary;
    }

    private void validateMyResidentPayload(Resident resident) {
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

    private Map<String, Object> toResidentResponse(Resident resident) {
        Map<String, Object> residentResponse = new HashMap<>();
        residentResponse.put("id", resident.getId());
        residentResponse.put("name", resident.getName());
        residentResponse.put("gender", resident.getGender() != null ? resident.getGender().name() : null);
        residentResponse.put("dob", resident.getDob());
        residentResponse.put("age", resident.getAge());
        residentResponse.put("cccd", resident.getCccd());
        residentResponse.put("phone", resident.getPhone());
        residentResponse.put("relationship", resident.getRelationship() != null ? resident.getRelationship().name() : null);
        residentResponse.put("residentCategory", resident.getResidentCategory() != null ? resident.getResidentCategory().name() : null);
        residentResponse.put("occupancyStatus", resident.getOccupancyStatus() != null ? resident.getOccupancyStatus().name() : null);
        residentResponse.put("status", resident.getStatus());
        residentResponse.put("householdId", resident.getHouseholdId());
        return residentResponse;
    }

    private Map<String, Object> toPaymentResponse(Payment payment) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", payment.getId());
        response.put("amount", payment.getAmount());
        response.put("paidAt", payment.getPaidAt());
        response.put("status", "PAID");
        response.put("title", "Hóa đơn đã thanh toán");
        return response;
    }

    private Map<String, Object> toRequestResponse(MaintenanceRequest request) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", request.getId());
        response.put("title", request.getTitle() != null ? request.getTitle() : "Yêu cầu hỗ trợ");
        response.put("content", request.getDescription());
        response.put("status", request.getStatus() != null ? request.getStatus().name() : null);
        response.put("createdAt", request.getCreatedAt());
        return response;
    }

    private Map<String, Object> toNotificationResponse(NotificationReceiver receiver) {
        Notification notification = receiver.getNotification();
        Map<String, Object> response = new HashMap<>();
        response.put("id", receiver.getId());
        response.put("isRead", receiver.getIsRead());
        if (notification != null) {
            response.put("title", notification.getTitle());
            response.put("content", notification.getContent());
            response.put("createdAt", notification.getCreatedAt());
            response.put("type", notification.getType() != null ? notification.getType().name() : null);
        }
        return response;
    }
}
