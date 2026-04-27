package com.dancu.qlydancu.service;

import com.dancu.qlydancu.dto.AdminAccountPageResponse;
import com.dancu.qlydancu.dto.AdminAccountResponse;
import com.dancu.qlydancu.dto.AdminAccountStatusPatchRequest;
import com.dancu.qlydancu.dto.AdminAccountUpsertRequest;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.UserRole;
import com.dancu.qlydancu.model.enums.UserStatus;
import com.dancu.qlydancu.repo.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminAccountService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public AdminAccountPageResponse getAccounts(int page, int size, String search, String role, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), searchPattern);
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), searchPattern);
                Predicate phoneMatch = cb.like(cb.lower(root.get("username")), searchPattern);
                predicates.add(cb.or(nameMatch, emailMatch, phoneMatch));
            }

            if (role != null && !role.trim().isEmpty() && !role.equalsIgnoreCase("ALL")) {
                UserRole userRole = role.equalsIgnoreCase("ADMIN") ? UserRole.ROLE_ADMIN : UserRole.ROLE_USER;
                predicates.add(cb.equal(root.get("roles"), userRole));
            }

            if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
                UserStatus userStatus = status.equalsIgnoreCase("ACTIVE") ? UserStatus.ACTIVE : UserStatus.BLOCKED;
                predicates.add(cb.equal(root.get("status"), userStatus));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> userPage = userRepository.findAll(spec, pageable);

        AdminAccountPageResponse response = new AdminAccountPageResponse();
        response.page = userPage.getNumber() + 1; 
        response.size = userPage.getSize();
        response.totalItems = userPage.getTotalElements();
        response.totalPages = userPage.getTotalPages();

        response.items = userPage.getContent().stream().map(this::mapToResponse).collect(Collectors.toList());

        AdminAccountPageResponse.AccountStats stats = new AdminAccountPageResponse.AccountStats();
        stats.totalAccounts = userRepository.count();
        stats.adminAccounts = userRepository.countByRoles(UserRole.ROLE_ADMIN);
        stats.residentAccounts = userRepository.countByRoles(UserRole.ROLE_USER);
        response.stats = stats;

        return response;
    }

    public AdminAccountResponse getAccount(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Account not found"));
        return mapToResponse(user);
    }

    public AdminAccountResponse createAccount(AdminAccountUpsertRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email)) {
            throw new RuntimeException("Email đã tồn tại");
        }
        if (request.phone != null && !request.phone.isEmpty() && userRepository.existsByUsername(request.phone)) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }

        User user = new User();
        user.setName(request.name);
        user.setEmail(request.email);
        if (request.phone != null && !request.phone.trim().isEmpty()) {
            user.setUsername(request.phone.trim()); 
        } else {
            user.setUsername(null);
        }
        user.setPassword(passwordEncoder.encode(request.password));
        
        user.setRoles(request.role.equalsIgnoreCase("ADMIN") ? UserRole.ROLE_ADMIN : UserRole.ROLE_USER);
        user.setStatus(request.status.equalsIgnoreCase("ACTIVE") ? UserStatus.ACTIVE : UserStatus.BLOCKED);
        user.setCreatedAt(LocalDateTime.now());

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    public AdminAccountResponse updateAccount(Long id, AdminAccountUpsertRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Account not found"));

        if (userRepository.existsByEmailIgnoreCaseAndIdNot(request.email, id)) {
            throw new RuntimeException("Email đã tồn tại");
        }
        if (request.phone != null && !request.phone.isEmpty() && userRepository.existsByUsernameAndIdNot(request.phone, id)) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }

        user.setName(request.name);
        user.setEmail(request.email);
        if (request.phone != null && !request.phone.trim().isEmpty()) {
            user.setUsername(request.phone.trim());
        } else {
            user.setUsername(null);
        }
        
        if (request.password != null && !request.password.trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.password));
        }

        user.setRoles(request.role.equalsIgnoreCase("ADMIN") ? UserRole.ROLE_ADMIN : UserRole.ROLE_USER);
        user.setStatus(request.status.equalsIgnoreCase("ACTIVE") ? UserStatus.ACTIVE : UserStatus.BLOCKED);

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    public void updateStatus(Long id, AdminAccountStatusPatchRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Account not found"));
        user.setStatus(request.status.equalsIgnoreCase("ACTIVE") ? UserStatus.ACTIVE : UserStatus.BLOCKED);
        userRepository.save(user);
    }

    public void updateStatus(Long id, boolean isActive) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Account not found"));
        user.setStatus(isActive ? UserStatus.ACTIVE : UserStatus.BLOCKED);
        userRepository.save(user);
    }

    public void deleteAccount(Long id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("Account not found");
        }
        userRepository.deleteById(id);
    }

    private AdminAccountResponse mapToResponse(User user) {
        AdminAccountResponse dto = new AdminAccountResponse();
        dto.id = user.getId();
        dto.fullName = user.getName();
        dto.email = user.getEmail();
        dto.phone = user.getUsername();
        dto.role = user.getRoles() == UserRole.ROLE_ADMIN ? "ADMIN" : "RESIDENT";
        dto.status = user.getStatus() == UserStatus.ACTIVE ? "ACTIVE" : "DISABLED";
        dto.createdAt = user.getCreatedAt();
        return dto;
    }
}
