package com.dancu.qlydancu.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.dancu.qlydancu.dto.UserRequestCreateRequest;
import com.dancu.qlydancu.dto.UserRequestResponse;
import com.dancu.qlydancu.model.enums.RequestType;
import com.dancu.qlydancu.service.UserRequestService;

@RestController
@RequestMapping("/api/user")
public class UserRequestController {

    @Autowired
    private UserRequestService userRequestService;

    @PostMapping(value = "/send-request", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserRequestResponse> createRequest(
            @RequestPart("type") String type,
            @RequestPart("description") String description,
            @RequestPart(value = "files", required = false) MultipartFile[] files,
            @AuthenticationPrincipal UserDetails userDetails) {

        RequestType requestType;
        try {
            requestType = RequestType.valueOf(type.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw new IllegalArgumentException("Loại yêu cầu không hợp lệ.");
        }
        String desc = description != null ? description.trim() : "";
        if (desc.isEmpty()) {
            throw new IllegalArgumentException("Nội dung mô tả không được để trống.");
        }
        UserRequestCreateRequest requestDto = new UserRequestCreateRequest();
        requestDto.setType(requestType);
        requestDto.setDescription(desc);

        String userEmail = userDetails.getUsername();
        MultipartFile[] safeFiles = files != null ? files : new MultipartFile[0];
        UserRequestResponse response = userRequestService.createRequest(requestDto, userEmail, safeFiles);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<Page<UserRequestResponse>> getRequestHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 5, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        String userEmail = userDetails.getUsername();
        Page<UserRequestResponse> historyPage = userRequestService.getRequestHistory(userEmail, pageable);

        return ResponseEntity.ok(historyPage);
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<?> deleteRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userEmail = userDetails.getUsername();
        userRequestService.deleteRequest(id, userEmail);

        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/history/{id}/update", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserRequestResponse> updateRequestMultipart(
            @PathVariable Long id,
            @RequestPart("type") String type,
            @RequestPart("description") String description,
            @RequestPart(value = "files", required = false) MultipartFile[] files,
            @RequestPart(value = "keepStoredFileNames", required = false) String keepStoredFileNamesJson,
            @AuthenticationPrincipal UserDetails userDetails) {

        RequestType requestType;
        try {
            requestType = RequestType.valueOf(type.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw new IllegalArgumentException("Loại yêu cầu không hợp lệ.");
        }
        String desc = description != null ? description.trim() : "";
        if (desc.isEmpty()) {
            throw new IllegalArgumentException("Nội dung mô tả không được để trống.");
        }
        UserRequestCreateRequest requestDto = new UserRequestCreateRequest();
        requestDto.setType(requestType);
        requestDto.setDescription(desc);

        String userEmail = userDetails.getUsername();
        MultipartFile[] safeFiles = files != null ? files : new MultipartFile[0];
        UserRequestResponse response = userRequestService.updateRequest(
                id, requestDto, userEmail, safeFiles, keepStoredFileNamesJson);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history/stats")
    public ResponseEntity<java.util.Map<String, Long>> getRequestStats(
            @AuthenticationPrincipal UserDetails userDetails) {

        String userEmail = userDetails.getUsername();
        return ResponseEntity.ok(userRequestService.getRequestStats(userEmail));
    }

    @GetMapping("/history/{id}/attachments/{storedName}")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @PathVariable String storedName,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userEmail = userDetails.getUsername();
        var payload = userRequestService.getAttachmentPayload(id, storedName, userEmail);
        String encoded = URLEncoder.encode(payload.originalName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(payload.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                .body(payload.resource());
    }
}