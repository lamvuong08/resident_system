package com.dancu.qlydancu.controller;

import java.util.Map;

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

import com.dancu.qlydancu.service.UserRequestAttachmentPayload;
import com.dancu.qlydancu.service.AdminUserRequestService;

@RestController
@RequestMapping("/api/admin/requests")
public class AdminUserRequestController {

    @Autowired
    private AdminUserRequestService adminUserRequestService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getRequest(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserRequestService.getRequest(id));
    }

    @GetMapping("/{id}/attachments/{storedFileName}")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @PathVariable String storedFileName) {
        UserRequestAttachmentPayload payload = adminUserRequestService.getAttachmentPayload(id, storedFileName);
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setInProgress(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "PROCESSING", null));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setComplete(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "DONE", null));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setReject(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(adminUserRequestService.updateStatus(id, "REJECTED", payload.get("reason")));
    }
}
