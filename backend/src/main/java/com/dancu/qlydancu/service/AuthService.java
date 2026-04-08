package com.dancu.qlydancu.service;

import com.dancu.qlydancu.dto.AuthRequests;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.Random;

import com.dancu.qlydancu.model.Otp;
import com.dancu.qlydancu.repo.OtpRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
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

    public User register(AuthRequests.RegisterRequest req) {
        Optional<User> exists = userRepository.findByEmail(req.email);
        if (exists.isPresent()) throw new RuntimeException("Email already in use");

        User u = new User();
        u.setName(req.name);
        u.setEmail(req.email);
        u.setPassword(passwordEncoder.encode(req.password));
        u.setRoles("ROLE_USER");
        return userRepository.save(u);
    }

    public String login(AuthRequests.LoginRequest req) {
        Authentication auth = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.email, req.password));
        String token = jwtUtil.generateToken(req.email);
        return token;
    }

    public String forgotPassword(AuthRequests.ForgotRequest req) {
        User user = userRepository.findByEmail(req.email).orElseThrow(() -> new RuntimeException("No user with that email"));
        String otp = generateOtp();
        Long expiry = Instant.now().plusSeconds(600).toEpochMilli();
        otpRepository.deleteByEmailAndPurpose(req.email, "RESET");
        otpRepository.save(new Otp(req.email, otp, expiry, "RESET"));
        emailService.sendSimpleMessage(req.email, "OTP đặt lại mật khẩu", "Mã OTP: " + otp + "\nHết hạn sau 10 phút.");
        return otp; // for testing; in prod do not return
    }

    @Transactional
    public void resetPassword(AuthRequests.ResetRequest req) {
        var maybe = otpRepository.findFirstByEmailAndPurposeOrderByIdDesc(req.email, "RESET");
        if (maybe.isEmpty()) throw new RuntimeException("Invalid or expired OTP");
        Otp otp = maybe.get();
        if (!otp.getCode().equals(req.otp) || otp.getExpiry() < Instant.now().toEpochMilli()) {
            throw new RuntimeException("Invalid or expired OTP");
        }
        User user = userRepository.findByEmail(req.email).orElseThrow(() -> new RuntimeException("No user"));
        user.setPassword(passwordEncoder.encode(req.newPassword));
        userRepository.save(user);
        otpRepository.deleteByEmailAndPurpose(req.email, "RESET");
    }

    public String sendRegisterOtp(AuthRequests.SendOtpRequest req) {
        Optional<User> exists = userRepository.findByEmail(req.email);
        if (exists.isPresent()) throw new RuntimeException("Email này đã có tài khoản rồi");
        String otp = generateOtp();
        Long expiry = Instant.now().plusSeconds(600).toEpochMilli();
        otpRepository.deleteByEmailAndPurpose(req.email, "REGISTER");
        otpRepository.save(new Otp(req.email, otp, expiry, "REGISTER"));
        emailService.sendSimpleMessage(req.email, "OTP đăng ký", "Mã OTP: " + otp + "\nHết hạn sau 10 phút.");
        return otp;
    }

    @Transactional
    public User confirmRegister(AuthRequests.ConfirmRegisterRequest req) {
        var maybe = otpRepository.findFirstByEmailAndPurposeOrderByIdDesc(req.email, "REGISTER");
        if (maybe.isEmpty()) throw new RuntimeException("Invalid or expired OTP");
        Otp otp = maybe.get();
        if (!otp.getCode().equals(req.otp) || otp.getExpiry() < Instant.now().toEpochMilli()) {
            throw new RuntimeException("Invalid or expired OTP");
        }
        Optional<User> exists = userRepository.findByEmail(req.email);
        if (exists.isPresent()) throw new RuntimeException("Email already in use");
        User u = new User();
        u.setName(req.name);
        u.setEmail(req.email);
        u.setPassword(passwordEncoder.encode(req.password));
        u.setRoles("ROLE_USER");
        User saved = userRepository.save(u);
        otpRepository.deleteByEmailAndPurpose(req.email, "REGISTER");
        return saved;
    }

    private String generateOtp() {
        Random rnd = new Random();
        int number = 100000 + rnd.nextInt(900000);
        return String.valueOf(number);
    }
}
