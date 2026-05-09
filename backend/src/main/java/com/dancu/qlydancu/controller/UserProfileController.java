package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.dto.ChangePasswordRequest;
import com.dancu.qlydancu.dto.UserEmailRequests;
import com.dancu.qlydancu.dto.UserProfileResponse;
import com.dancu.qlydancu.dto.UserProfileUpdateRequest;
import com.dancu.qlydancu.service.UserEmailService;
import com.dancu.qlydancu.service.UserProfileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserProfileController.class);

    private final UserProfileService userProfileService;
    private final UserEmailService userEmailService;

    public UserProfileController(UserProfileService userProfileService, UserEmailService userEmailService) {
        this.userProfileService = userProfileService;
        this.userEmailService = userEmailService;
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> getMe(Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(userProfileService.getProfile(email));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> updateMe(
            Authentication authentication,
            @RequestBody UserProfileUpdateRequest request
    ) {
        String email = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(userProfileService.updateProfile(email, request));
    }

    @PostMapping("/email/send-otp")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> sendEmailOtp(
            Authentication authentication,
            @RequestBody UserEmailRequests.SendOtpRequest request
    ) {
        String email = authentication != null ? authentication.getName() : null;
        String newEmail = request != null ? request.newEmail : null;
        LOGGER.info("Send email OTP requested, currentEmail={}, newEmail={}", email, newEmail);
        return ResponseEntity.ok(userEmailService.sendEmailOtp(email, newEmail));
    }

    @PostMapping("/email/verify-otp")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> verifyEmailOtp(
            Authentication authentication,
            @RequestBody UserEmailRequests.VerifyOtpRequest request
    ) {
        String email = authentication != null ? authentication.getName() : null;
        String newEmail = request != null ? request.newEmail : null;
        LOGGER.info("Verify email OTP requested, currentEmail={}, newEmail={}", email, newEmail);
        userEmailService.verifyEmailOtp(email, newEmail, request != null ? request.otp : null);
        return ResponseEntity.ok(Map.of("message", "Xác minh OTP thành công"));
    }

    @PutMapping("/email")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> updateEmail(
            Authentication authentication,
            @RequestBody UserEmailRequests.UpdateEmailRequest request
    ) {
        String email = authentication != null ? authentication.getName() : null;
        String newEmail = request != null ? request.newEmail : null;
        LOGGER.info("Update email requested, currentEmail={}, newEmail={}", email, newEmail);
        return ResponseEntity.ok(userEmailService.updateEmail(email, newEmail, request != null ? request.otp : null));
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> changePassword(
            Authentication authentication,
            @RequestBody ChangePasswordRequest request
    ) {
        String email = authentication != null ? authentication.getName() : null;
        LOGGER.info("Change password requested, currentEmail={}", email);
        userProfileService.changePassword(
                email,
                request != null ? request.oldPassword : null,
                request != null ? request.newPassword : null,
                request != null ? request.confirmPassword : null
        );
        LOGGER.info("Change password success, currentEmail={}", email);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
    }
}
