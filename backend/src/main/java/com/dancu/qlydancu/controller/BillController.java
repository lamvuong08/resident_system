package com.dancu.qlydancu.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.BillDetailRowResponse;
import com.dancu.qlydancu.service.BillService;

@RestController
@RequestMapping("/api/bills")
@CrossOrigin(origins = "*")
public class BillController {

    @Autowired
    private BillService billService;

    /**
     * API dành cho User lấy danh sách chi tiết từng loại phí (Phẳng hóa)
     * Đã sửa kiểu trả về thành List để khớp với Service và Frontend
     */
    @GetMapping("/my-apartment/details")
    public ResponseEntity<List<BillDetailRowResponse>> getMyBillDetails() {
        try {
            // Service trả về List<BillDetailRowResponse>
            List<BillDetailRowResponse> details = billService.getBillDetailsForCurrentUser();
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            // Log lỗi nếu cần
            return ResponseEntity.badRequest().build();
        }
    }
}