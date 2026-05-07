package com.dancu.qlydancu.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.UserRequestResponse;
import com.dancu.qlydancu.model.enums.RequestStatus;
import com.dancu.qlydancu.service.UserRequestService;

@RestController
@RequestMapping("/api/admin/requests")
public class AdminRequestController {

    @Autowired
    private UserRequestService userRequestService;

    @GetMapping
    public ResponseEntity<Page<UserRequestResponse>> getAllRequests(
            @RequestParam(required = false) String apartmentCode,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        // BƯỚC LÀM SẠCH DỮ LIỆU (Sanitize Data): 
        // Nếu Frontend gửi lên chuỗi rỗng "?apartmentCode=", ta ép nó về null
        // để Repository hiểu là "Không có bộ lọc, hãy lấy tất cả"
        if (apartmentCode != null && apartmentCode.trim().isEmpty()) {
            apartmentCode = null;
        }

        Page<UserRequestResponse> responsePage = userRequestService.getAllRequestsWithDetails(apartmentCode, pageable);
        return ResponseEntity.ok(responsePage);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<UserRequestResponse> updateRequestStatus(
            @PathVariable Long id,
            @RequestParam RequestStatus status) {
        
        UserRequestResponse response = userRequestService.updateRequestStatus(id, status);
        return ResponseEntity.ok(response);
    }
}