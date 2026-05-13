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
            // Service trả về List<BillDetailRowResponse>
            List<BillDetailRowResponse> details = billService.getBillDetailsForCurrentUser(null);
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            // Log lỗi nếu cần
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/user/details")
    public ResponseEntity<List<BillDetailRowResponse>> getUserBillDetails(
            @RequestParam(required = false) List<BillDetailStatus> statuses) {
        // Truyền thẳng tham số xuống Service
        return ResponseEntity.ok(billService.getBillDetailsForCurrentUser(statuses));
    }

    @GetMapping("/admin/details")
    public ResponseEntity<Page<AdminBillDetailResponse>> getAdminBillDetails(
            @ModelAttribute BillDetailFilterRequest filter, // Lấy toàn bộ tham số URL map vào Object
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        
        return ResponseEntity.ok(billService.getAdminBillDetails(filter, pageable));
    }
}