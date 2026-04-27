package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.dto.UserStatusUpdateRequest;
import com.dancu.qlydancu.service.AdminAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserStatusController {

    @Autowired
    private AdminAccountService accountService;

    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable Long id, @RequestBody UserStatusUpdateRequest request) {
        if (request == null || request.status == null) {
            throw new RuntimeException("Trạng thái không hợp lệ");
        }
        accountService.updateStatus(id, request.status);
        return ResponseEntity.ok().build();
    }
}
