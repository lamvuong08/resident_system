package com.dancu.qlydancu.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.UserRequestCreateRequest;
import com.dancu.qlydancu.dto.UserRequestResponse;
import com.dancu.qlydancu.service.UserRequestService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/user")
public class UserRequestController {

    @Autowired
    private UserRequestService userRequestService;

    @PostMapping("/send-request")
    public ResponseEntity<UserRequestResponse> createRequest(
            @Valid @RequestBody UserRequestCreateRequest requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userEmail = userDetails.getUsername();
        UserRequestResponse response = userRequestService.createRequest(requestDto, userEmail);
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

    @PutMapping("/history/{id}")
    public ResponseEntity<UserRequestResponse> updateRequest(
            @PathVariable Long id,
            @Valid @RequestBody UserRequestCreateRequest requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userEmail = userDetails.getUsername();
        UserRequestResponse response = userRequestService.updateRequest(id, requestDto, userEmail);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history/stats")
    public ResponseEntity<java.util.Map<String, Long>> getRequestStats(
            @AuthenticationPrincipal UserDetails userDetails) {

        String userEmail = userDetails.getUsername();
        return ResponseEntity.ok(userRequestService.getRequestStats(userEmail));
    }
}