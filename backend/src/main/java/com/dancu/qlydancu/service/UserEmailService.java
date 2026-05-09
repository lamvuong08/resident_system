package com.dancu.qlydancu.service;

import com.dancu.qlydancu.model.Otp;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.OtpPurpose;
import com.dancu.qlydancu.repo.OtpRepository;
import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.regex.Pattern;

@Service
@Transactional
public class UserEmailService {
    private static final Logger LOGGER = LoggerFactory.getLogger(UserEmailService.class);
    private static final long OTP_EXPIRY_SECONDS = 300L;
    private static final long RESEND_COOLDOWN_SECONDS = 60L;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UserRepository userRepository;
    private final OtpRepository otpRepository;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;

    public UserEmailService(UserRepository userRepository,
                            OtpRepository otpRepository,
                            EmailService emailService,
                            JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.otpRepository = otpRepository;
        this.emailService = emailService;
        this.jwtUtil = jwtUtil;
    }

    public Map<String, Object> sendEmailOtp(String currentEmail, String newEmailRaw) {
        String currentEmailNormalized = normalizeEmail(currentEmail);
        String newEmail = normalizeEmail(newEmailRaw);

        validateEmailRequest(currentEmailNormalized, newEmail);

        Optional<Otp> latestOtp = otpRepository.findFirstByEmailAndPurposeOrderByIdDesc(newEmail, OtpPurpose.VERIFY_EMAIL);
        if (latestOtp.isPresent()) {
            long expiryMillis = latestOtp.get().getExpiry() != null ? latestOtp.get().getExpiry() : 0L;
            long assumedCreatedAt = expiryMillis - (OTP_EXPIRY_SECONDS * 1000L);
            long elapsedSeconds = (Instant.now().toEpochMilli() - assumedCreatedAt) / 1000L;
            long remainingSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
            if (remainingSeconds > 0) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Vui lòng thử lại sau " + remainingSeconds + " giây"
                );
            }
        }

        String generatedOtp = generateOtp();
        long expiryMillis = Instant.now().plusSeconds(OTP_EXPIRY_SECONDS).toEpochMilli();

        otpRepository.deleteByEmailAndPurpose(newEmail, OtpPurpose.VERIFY_EMAIL);
        otpRepository.save(new Otp(newEmail, generatedOtp, expiryMillis, OtpPurpose.VERIFY_EMAIL));

        LOGGER.info("OTP created for email change, email={}", newEmail);
        emailService.sendSimpleMessage(newEmail, "OTP xác minh email", "Mã OTP: " + generatedOtp + "\nHết hạn sau 5 phút.");
        LOGGER.info("OTP email sent to {}", newEmail);

        return Map.of(
                "message", "Đã gửi mã xác minh",
                "expiresInSeconds", OTP_EXPIRY_SECONDS,
                "cooldownSeconds", RESEND_COOLDOWN_SECONDS
        );
    }

    public void verifyEmailOtp(String currentEmail, String newEmailRaw, String otpRaw) {
        String currentEmailNormalized = normalizeEmail(currentEmail);
        String newEmail = normalizeEmail(newEmailRaw);
        String otp = otpRaw != null ? otpRaw.trim() : null;

        validateEmailRequest(currentEmailNormalized, newEmail);
        if (otp == null || otp.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không hợp lệ");
        }

        Otp latestOtp = otpRepository.findFirstByEmailAndPurposeOrderByIdDesc(newEmail, OtpPurpose.VERIFY_EMAIL)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không hợp lệ hoặc đã hết hạn"));

        if (!latestOtp.getCode().equals(otp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không hợp lệ hoặc đã hết hạn");
        }
        if (latestOtp.getExpiry() < Instant.now().toEpochMilli()) {
            otpRepository.deleteByEmailAndPurpose(newEmail, OtpPurpose.VERIFY_EMAIL);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP đã hết hạn");
        }
    }

    public Map<String, String> updateEmail(String currentEmail, String newEmailRaw, String otpRaw) {
        String currentEmailNormalized = normalizeEmail(currentEmail);
        String newEmail = normalizeEmail(newEmailRaw);
        String otp = otpRaw != null ? otpRaw.trim() : null;

        validateEmailRequest(currentEmailNormalized, newEmail);
        if (otp == null || otp.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không hợp lệ");
        }

        User user = userRepository.findByEmail(currentEmailNormalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Otp latestOtp = otpRepository.findFirstByEmailAndPurposeOrderByIdDesc(newEmail, OtpPurpose.VERIFY_EMAIL)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không hợp lệ hoặc đã hết hạn"));

        if (!latestOtp.getCode().equals(otp) || latestOtp.getExpiry() < Instant.now().toEpochMilli()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không hợp lệ hoặc đã hết hạn");
        }

        if (userRepository.existsByEmailIgnoreCaseAndIdNot(newEmail, user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã được sử dụng");
        }

        user.setEmail(newEmail);
        userRepository.save(user);
        otpRepository.deleteByEmailAndPurpose(newEmail, OtpPurpose.VERIFY_EMAIL);

        String newToken = jwtUtil.generateToken(newEmail);
        return Map.of(
                "message", "Cập nhật email thành công",
                "email", newEmail,
                "token", newToken
        );
    }

    private void validateEmailRequest(String currentEmail, String newEmail) {
        if (currentEmail == null || currentEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        if (newEmail == null || newEmail.isBlank() || !EMAIL_PATTERN.matcher(newEmail).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email không hợp lệ");
        }
        if (newEmail.equalsIgnoreCase(currentEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email mới không được trùng email hiện tại");
        }
        if (userRepository.existsByEmailIgnoreCase(newEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã được sử dụng");
        }
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
