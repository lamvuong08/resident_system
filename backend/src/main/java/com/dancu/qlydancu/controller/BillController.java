package com.dancu.qlydancu.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.AdminBillDetailResponse;
import com.dancu.qlydancu.dto.BillDetailFilterRequest;
import com.dancu.qlydancu.dto.BillDetailRowResponse;
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.service.BillService;

@RestController
@RequestMapping("/api/bills")
@CrossOrigin(origins = "*")
public class BillController {

    @Autowired
    private BillService billService;

    @GetMapping("/my-apartment/details")
    public ResponseEntity<List<BillDetailRowResponse>> getMyBillDetails() {
        try {
            List<BillDetailRowResponse> details = billService.getBillDetailsForCurrentUser(null);
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/admin/create-fixed-fee")
    public ResponseEntity<?> createFixedFeeBill(@RequestBody com.dancu.qlydancu.dto.FixedFeeRequest request) {
        try {
            billService.createFixedFeeBill(request);
            return ResponseEntity.ok("Tạo hóa đơn phí cố định thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/admin/details/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestParam BillDetailStatus status) {
        billService.updateBillDetailStatus(id, status);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/user/details")
    public ResponseEntity<List<BillDetailRowResponse>> getUserBillDetails(
            @RequestParam(required = false) List<BillDetailStatus> statuses) {
        return ResponseEntity.ok(billService.getBillDetailsForCurrentUser(statuses));
    }

    @GetMapping("/admin/details")
    public ResponseEntity<Page<AdminBillDetailResponse>> getAdminBillDetails(
            @ModelAttribute BillDetailFilterRequest filter, 
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        
        return ResponseEntity.ok(billService.getAdminBillDetails(filter, pageable));
    }
}