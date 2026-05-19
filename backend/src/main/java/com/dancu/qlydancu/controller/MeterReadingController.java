package com.dancu.qlydancu.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.MeterReadingRequest;
import com.dancu.qlydancu.service.MeterReadingService;

@RestController
@RequestMapping("/api/admin/meter-readings")
@CrossOrigin(origins = "*")
public class MeterReadingController {

    @Autowired
    private MeterReadingService meterReadingService;

    @PostMapping("/preview")
    public ResponseEntity<?> previewCalculateBill(@RequestBody MeterReadingRequest request) {
        try {
            Long calculatedAmount = meterReadingService.previewCalculateBill(request);
            return ResponseEntity.ok(calculatedAmount);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/record")
    public ResponseEntity<?> recordMeterReading(@RequestBody MeterReadingRequest request) {
        try {
            meterReadingService.recordAndCalculateBill(request);
            return ResponseEntity.ok("Đã nhập chỉ số và cập nhật hóa đơn thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}