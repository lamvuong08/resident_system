package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.dto.AdminAccountAssignRequest;
import com.dancu.qlydancu.dto.AdminAccountChangeApartmentRequest;
import com.dancu.qlydancu.dto.AdminAccountPageResponse;
import com.dancu.qlydancu.dto.AdminAccountResponse;
import com.dancu.qlydancu.dto.AdminAccountStatusPatchRequest;
import com.dancu.qlydancu.dto.AdminAccountUpsertRequest;
import com.dancu.qlydancu.service.AdminAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/accounts")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAccountController {

    @Autowired
    private AdminAccountService accountService;

    @GetMapping
    public ResponseEntity<AdminAccountPageResponse> getAccounts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status
    ) {
        AdminAccountPageResponse response = accountService.getAccounts(page - 1, size, search, role, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminAccountResponse> getAccount(@PathVariable Long id) {
        return ResponseEntity.ok(accountService.getAccount(id));
    }

    @PostMapping
    public ResponseEntity<AdminAccountResponse> createAccount(@RequestBody AdminAccountUpsertRequest request) {
        return ResponseEntity.ok(accountService.createAccount(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminAccountResponse> updateAccount(@PathVariable Long id, @RequestBody AdminAccountUpsertRequest request) {
        return ResponseEntity.ok(accountService.updateAccount(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable Long id, @RequestBody AdminAccountStatusPatchRequest request) {
        accountService.updateStatus(id, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable Long id) {
        accountService.deleteAccount(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/assign-apartment")
    public ResponseEntity<Void> assignApartment(@PathVariable Long id, @RequestBody AdminAccountAssignRequest request) {
        accountService.assignApartment(id, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/change-apartment")
    public ResponseEntity<Void> changeApartment(@PathVariable Long id, @RequestBody AdminAccountChangeApartmentRequest request) {
        accountService.changeApartment(id, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/remove-apartment")
    public ResponseEntity<Void> removeApartment(@PathVariable Long id) {
        accountService.removeApartment(id);
        return ResponseEntity.ok().build();
    }
}
