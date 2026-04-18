package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.dto.AuthRequests;
import com.dancu.qlydancu.dto.AuthResponses;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody AuthRequests.RegisterRequest registerRequest) {
        User registeredUser = authService.register(registerRequest);
        return ResponseEntity.ok(registeredUser.getEmail());
    }

    @PostMapping("/send-register-otp")
    public ResponseEntity<Map<String, String>> sendRegisterOtp(@RequestBody AuthRequests.SendOtpRequest sendOtpRequest) {
        authService.sendRegisterOtp(sendOtpRequest);
        return ResponseEntity.ok(Map.of("message", "Đã gửi OTP đăng ký tới email"));
    }

    @PostMapping("/confirm-register")
    public ResponseEntity<String> confirmRegister(@RequestBody AuthRequests.ConfirmRegisterRequest confirmRegisterRequest) {
        User confirmedUser = authService.confirmRegister(confirmRegisterRequest);
        return ResponseEntity.ok(confirmedUser.getEmail());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponses.AuthResponse> login(@RequestBody AuthRequests.LoginRequest loginRequest) {
        AuthResponses.AuthResponse authResponse = authService.login(loginRequest);
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/forgot")
    public ResponseEntity<Map<String, String>> forgot(@RequestBody AuthRequests.ForgotRequest forgotRequest) {
        authService.forgotPassword(forgotRequest);
        return ResponseEntity.ok(Map.of("message", "Đã gửi OTP đặt lại mật khẩu tới email"));
    }

    @PostMapping("/reset")
    public ResponseEntity<String> reset(@RequestBody AuthRequests.ResetRequest resetRequest) {
        authService.resetPassword(resetRequest);
        return ResponseEntity.ok("OK");
    }
}
