package com.dancu.qlydancu.service;

import com.dancu.qlydancu.dto.UserProfileResponse;
import com.dancu.qlydancu.dto.UserProfileUpdateRequest;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.UserRole;
import com.dancu.qlydancu.model.enums.UserStatus;
import com.dancu.qlydancu.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
@Transactional
public class UserProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserProfileService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserProfileResponse getProfile(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return mapToResponse(user);
    }

    public UserProfileResponse updateProfile(String email, UserProfileUpdateRequest request) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String name = request != null ? safeTrim(request.name) : null;
        String phone = request != null ? safeTrim(request.phone) : null;

        if (name == null || name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ tên không được để trống");
        }
        if (phone == null || phone.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại không hợp lệ");
        }

        if (userRepository.existsByUsernameAndIdNot(phone, user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã tồn tại");
        }

        user.setName(name);
        user.setUsername(phone);

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    public void changePassword(String email, String oldPassword, String newPassword, String confirmPassword) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        String oldPwd = safeTrim(oldPassword);
        String newPwd = safeTrim(newPassword);
        String confirmPwd = safeTrim(confirmPassword);

        if (oldPwd == null || oldPwd.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mật khẩu cũ");
        }
        if (newPwd == null || newPwd.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mật khẩu mới");
        }
        if (newPwd.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải từ 6 ký tự");
        }
        if (confirmPwd == null || confirmPwd.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng xác nhận mật khẩu mới");
        }
        if (!newPwd.equals(confirmPwd)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không khớp");
        }

        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(oldPwd, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu cũ không đúng");
        }

        user.setPassword(passwordEncoder.encode(newPwd));
        userRepository.save(user);
    }

    private UserProfileResponse mapToResponse(User user) {
        UserProfileResponse dto = new UserProfileResponse();
        dto.id = user.getId();
        dto.name = user.getName();
        dto.email = user.getEmail();
        dto.phone = user.getUsername();
        dto.role = user.getRoles() == UserRole.ROLE_ADMIN ? "ADMIN" : "USER";
        if (user.getStatus() == UserStatus.ACTIVE) {
            dto.status = "ACTIVE";
        } else if (user.getStatus() == UserStatus.BLOCKED) {
            dto.status = "DISABLED";
        } else if (user.getStatus() != null) {
            dto.status = user.getStatus().name();
        } else {
            dto.status = "UNKNOWN";
        }
        return dto;
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        return email.trim().toLowerCase();
    }

    private String safeTrim(String value) {
        if (value == null) return null;
        return value.trim();
    }
}
