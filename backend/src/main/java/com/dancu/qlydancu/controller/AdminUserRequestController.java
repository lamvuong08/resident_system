package com.dancu.qlydancu.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.service.AdminUserRequestService;

@RestController
@RequestMapping("/api/admin/requests")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserRequestController {

    @Autowired
    private AdminUserRequestService adminUserRequestService;

    @GetMapping
    public ResponseEntity<?> getRequests(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminUserRequestService.getRequests(search, type, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRequest(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserRequestService.getRequest(id));
    }

    @PatchMapping("/{id}/in-progress")
    public ResponseEntity<?> setInProgress(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "PROCESSING", null));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<?> setComplete(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "DONE", null));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<?> setReject(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "REJECTED", payload.get("reason")));
    }
}
