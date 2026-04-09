package com.dancu.qlydancu.controller;

import com.dancu.qlydancu.dto.AuthRequests;
import com.dancu.qlydancu.dto.AuthResponses;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequests.RegisterRequest req) {
        User u = authService.register(req);
        return ResponseEntity.ok(u.getEmail());
    }

    @PostMapping("/send-register-otp")
    public ResponseEntity<?> sendRegisterOtp(@RequestBody AuthRequests.SendOtpRequest req) {
        String otp = authService.sendRegisterOtp(req);
        return ResponseEntity.ok(otp);
    }

    @PostMapping("/confirm-register")
    public ResponseEntity<?> confirmRegister(@RequestBody AuthRequests.ConfirmRegisterRequest req) {
        User u = authService.confirmRegister(req);
        return ResponseEntity.ok(u.getEmail());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequests.LoginRequest req) {
        AuthResponses.AuthResponse resp = authService.login(req);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/forgot")
    public ResponseEntity<?> forgot(@RequestBody AuthRequests.ForgotRequest req) {
        String otp = authService.forgotPassword(req);
        return ResponseEntity.ok(otp);
    }
    @PostMapping("/reset")
    public ResponseEntity<?> reset(@RequestBody AuthRequests.ResetRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok("OK");
    }
}
