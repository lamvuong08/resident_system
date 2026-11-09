package com.dancu.qlydancu.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.MeterReadingRequest;
import com.dancu.qlydancu.service.MeterReadingService;

@RestController
@RequestMapping("/api/admin/meter-readings")
@CrossOrigin(origins = "*")
public class MeterReadingController {

    @Autowired
    private MeterReadingService meterReadingService;
    @Autowired private com.dancu.qlydancu.service.ElectricityWorkflowService workflow;

    @GetMapping("/{id}/history")
    public Object history(@org.springframework.web.bind.annotation.PathVariable long id) { return workflow.history(id); }

    @PostMapping("/bulk-approve")
    public Object approve(@jakarta.validation.Valid @RequestBody com.dancu.qlydancu.dto.ElectricityWorkflowRequest.Batch request) {return workflow.approve(request);}

    @PostMapping("/bulk-issue")
    public Object issue(@jakarta.validation.Valid @RequestBody com.dancu.qlydancu.dto.ElectricityWorkflowRequest.Batch request) {return workflow.issue(request);}

    @PostMapping("/{id}/reject")
    public void reject(@org.springframework.web.bind.annotation.PathVariable long id,
        @jakarta.validation.Valid @RequestBody com.dancu.qlydancu.dto.ElectricityWorkflowRequest.Rejection request) {workflow.reject(id,request);}

    @GetMapping("/apartments")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> getApartmentsForMeterReading(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) String billingMonth) {
        try {
            return ResponseEntity.ok(meterReadingService.getApartmentsForMeterReading(buildingId, floor, billingMonth));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/preview")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> previewCalculateBill(@RequestBody MeterReadingRequest request) {
        try {
            Long calculatedAmount = meterReadingService.previewCalculateBill(request);
            return ResponseEntity.ok(calculatedAmount);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/record")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> recordMeterReading(@RequestBody MeterReadingRequest request) {
        try {
            meterReadingService.recordAndCalculateBill(request);
            return ResponseEntity.ok("Đã gửi chỉ số chờ duyệt; chưa tạo khoản phải thanh toán.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
