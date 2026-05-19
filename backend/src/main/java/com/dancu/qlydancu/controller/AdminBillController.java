package com.dancu.qlydancu.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.dancu.qlydancu.dto.AdminAggregatedBillResponse;
import com.dancu.qlydancu.dto.AdminBillFullResponse;
import com.dancu.qlydancu.dto.BulkBillRequest;
import com.dancu.qlydancu.dto.BillConfirmRequest;
import com.dancu.qlydancu.dto.BillStatisticsResponse;
import com.dancu.qlydancu.dto.FixedFeeRequest;
import com.dancu.qlydancu.service.BillService;

@RestController
@RequestMapping("/api/admin/payments")
@CrossOrigin(origins = "*")
public class AdminBillController {

    @Autowired
    private BillService billService;

    @GetMapping
    public ResponseEntity<Page<AdminAggregatedBillResponse>> getAggregatedBills(
            @RequestParam(required = false) String apartmentCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(billService.getAdminAggregatedBills(apartmentCode, status, month, year, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminBillFullResponse> getBillDetailFull(@PathVariable Long id) {
        return ResponseEntity.ok(billService.getAdminBillDetailFull(id));
    }

    @GetMapping("/statistics")
    public ResponseEntity<BillStatisticsResponse> getStatistics() {
        return ResponseEntity.ok(billService.getStatistics());
    }

    @PostMapping
    public ResponseEntity<?> createBill(@RequestBody FixedFeeRequest request) {
        billService.createElectricityFee(request);
        return ResponseEntity.ok("Tạo hóa đơn thành công!");
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> createBulkBills(@RequestBody BulkBillRequest request) {
        billService.createBulkBills(request);
        return ResponseEntity.ok("Tạo hóa đơn hàng loạt thành công!");
    }

    @PostMapping("/initialize-month")
    public ResponseEntity<?> initializeMonth(@RequestParam String billingMonth) {
        billService.initializeAllBillsForMonth(billingMonth);
        return ResponseEntity.ok("Đã khởi tạo hóa đơn tháng " + billingMonth + " cho toàn bộ căn hộ");
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBill(@RequestBody com.dancu.qlydancu.dto.BillDetailUpdateRequest request) {
        billService.updateBillDetail(request);
        return ResponseEntity.ok("Cập nhật hóa đơn thành công!");
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<?> confirmPayment(@PathVariable Long id, @RequestBody BillConfirmRequest request) {
        billService.confirmBillPayment(id, request);
        return ResponseEntity.ok("Xác nhận thanh toán thành công!");
    }

}
