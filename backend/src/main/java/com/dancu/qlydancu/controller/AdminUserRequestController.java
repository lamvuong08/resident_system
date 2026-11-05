package com.dancu.qlydancu.controller;

import java.util.Map;
import org.springframework.security.core.Authentication;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import jakarta.validation.Valid;
import com.dancu.qlydancu.dto.RequestAssignmentRequest;

import com.dancu.qlydancu.service.UserRequestAttachmentPayload;
import com.dancu.qlydancu.service.AdminUserRequestService;

@RestController
@RequestMapping("/api/admin/requests")
public class AdminUserRequestController {

    @Autowired
    private AdminUserRequestService adminUserRequestService;

    @GetMapping("/assignable-staff")
    public ResponseEntity<?> getAssignableStaff(Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.getAssignableStaff(authentication.getName()));
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<?> assign(@PathVariable Long id, @Valid @RequestBody RequestAssignmentRequest request, Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.assign(id, request, false, authentication.getName()));
    }

    @PutMapping("/{id}/reassign")
    public ResponseEntity<?> reassign(@PathVariable Long id, @Valid @RequestBody RequestAssignmentRequest request, Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.assign(id, request, true, authentication.getName()));
    }

    @GetMapping("/{id}/assignment-history")
    public ResponseEntity<?> history(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.getAssignmentHistory(id, authentication.getName()));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> getRequests(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status, Authentication authentication) {
        
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminUserRequestService.getRequests(search, type, status, pageable, authentication.getName()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> getRequest(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.getRequest(id, authentication.getName()));
    }

    @GetMapping("/{id}/attachments/{storedFileName}")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @PathVariable String storedFileName, Authentication authentication) {
        UserRequestAttachmentPayload payload = adminUserRequestService.getAttachmentPayload(id, storedFileName, authentication.getName());
        MediaType contentType = MediaType.APPLICATION_OCTET_STREAM;
        if (payload.contentType() != null && !payload.contentType().isBlank()) {
            try {
                contentType = MediaType.parseMediaType(payload.contentType());
            } catch (Exception ignored) {
                contentType = MediaType.APPLICATION_OCTET_STREAM;
            }
        }

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + payload.originalName().replace("\"", "") + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(payload.resource());
    }

    @PatchMapping("/{id}/in-progress")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> setInProgress(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "PROCESSING", null, authentication.getName()));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> setComplete(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "DONE", null, authentication.getName()));
    }

    @PatchMapping("/{id}/start")
    public ResponseEntity<?> start(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "START", null, authentication.getName()));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> setReject(@PathVariable Long id, @RequestBody Map<String, String> payload, Authentication authentication) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "REJECTED", payload.get("reason"), authentication.getName()));
    }
}
