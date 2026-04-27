package com.dancu.qlydancu.service;

import com.dancu.qlydancu.dto.AuthRequests;
import com.dancu.qlydancu.dto.AuthResponses;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.OtpPurpose;
import com.dancu.qlydancu.model.enums.UserRole;
import com.dancu.qlydancu.model.enums.UserStatus;
import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.Random;

import com.dancu.qlydancu.model.Otp;
import com.dancu.qlydancu.repo.OtpRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private static final long OTP_EXPIRY_SECONDS = 600L;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final OtpRepository otpRepository;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager, JwtUtil jwtUtil, EmailService emailService, OtpRepository otpRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.otpRepository = otpRepository;
    }

    public User register(AuthRequests.RegisterRequest registerRequest) {
        validateEmailNotExists(registerRequest.email);
        User newUser = createUser(registerRequest.name, registerRequest.email, registerRequest.password);
        return userRepository.save(newUser);
    }

    public AuthResponses.AuthResponse login(AuthRequests.LoginRequest req) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.email, req.password));
        } catch (DisabledException | LockedException ex) {
            throw new AuthenticationServiceException("Tài khoản đã bị vô hiệu hóa");
        }
        String token = jwtUtil.generateToken(req.email);
        User user = userRepository.findByEmail(req.email).orElseThrow(() -> new RuntimeException("No user found"));
        return new AuthResponses.AuthResponse(token, req.email, user.getRoles() != null ? user.getRoles().name() : null, user.getName());
    }

    @Transactional
    public String forgotPassword(AuthRequests.ForgotRequest forgotRequest) {
        String email = normalizeEmail(forgotRequest.email);
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email không hợp lệ");
        }
        userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("No user with that email"));

        String generatedOtp = generateOtp();
        Long expiryMillis = Instant.now().plusSeconds(OTP_EXPIRY_SECONDS).toEpochMilli();

        otpRepository.deleteByEmailAndPurpose(email, OtpPurpose.RESET_PASSWORD);
        otpRepository.save(new Otp(email, generatedOtp, expiryMillis, OtpPurpose.RESET_PASSWORD));
        emailService.sendSimpleMessage(email, "OTP đặt lại mật khẩu", "Mã OTP: " + generatedOtp + "\nHết hạn sau 10 phút.");

        return generatedOtp; 
    }

    @Transactional
    public void resetPassword(AuthRequests.ResetRequest resetRequest) {
        String email = normalizeEmail(resetRequest.email);
        String otpCode = resetRequest.otp != null ? resetRequest.otp.trim() : null;
        if (email == null || email.isBlank() || otpCode == null || otpCode.isBlank()) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        Otp otp = otpRepository.findFirstByEmailAndPurposeOrderByIdDesc(email, OtpPurpose.RESET_PASSWORD)
                .orElseThrow(() -> new RuntimeException("Invalid or expired OTP"));

        if (!otp.getCode().equals(otpCode) || otp.getExpiry() < Instant.now().toEpochMilli()) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        User existingUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No user"));
        existingUser.setPassword(passwordEncoder.encode(resetRequest.newPassword));
        userRepository.save(existingUser);

        otpRepository.deleteByEmailAndPurpose(email, OtpPurpose.RESET_PASSWORD);
    }

    @Transactional
    public String sendRegisterOtp(AuthRequests.SendOtpRequest sendOtpRequest) {
        String email = sendOtpRequest.email;
        validateEmailNotExists(email);

        String generatedOtp = generateOtp();
        Long expiryMillis = Instant.now().plusSeconds(OTP_EXPIRY_SECONDS).toEpochMilli();

        otpRepository.deleteByEmailAndPurpose(email, OtpPurpose.REGISTER);
        otpRepository.save(new Otp(email, generatedOtp, expiryMillis, OtpPurpose.REGISTER));
        emailService.sendSimpleMessage(email, "OTP đăng ký", "Mã OTP: " + generatedOtp + "\nHết hạn sau 10 phút.");

        return generatedOtp;
    }

    @Transactional
    public User confirmRegister(AuthRequests.ConfirmRegisterRequest confirmRegisterRequest) {
        Otp otp = otpRepository.findFirstByEmailAndPurposeOrderByIdDesc(confirmRegisterRequest.email, OtpPurpose.REGISTER)
                .orElseThrow(() -> new RuntimeException("Invalid or expired OTP"));

        if (!otp.getCode().equals(confirmRegisterRequest.otp) || otp.getExpiry() < Instant.now().toEpochMilli()) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        validateEmailNotExists(confirmRegisterRequest.email);
        User newUser = createUser(confirmRegisterRequest.name, confirmRegisterRequest.email, confirmRegisterRequest.password);
        User savedUser = userRepository.save(newUser);

        otpRepository.deleteByEmailAndPurpose(confirmRegisterRequest.email, OtpPurpose.REGISTER);
        return savedUser;
    }

    private void validateEmailNotExists(String email) {
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            throw new RuntimeException("Email already in use");
        }
    }

    private User createUser(String name, String email, String rawPassword) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRoles(UserRole.ROLE_USER);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private String generateOtp() {
        Random random = new Random();
        int otpNumber = 100000 + random.nextInt(900000);
        return String.valueOf(otpNumber);
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        return email.trim().toLowerCase();
    }
}
