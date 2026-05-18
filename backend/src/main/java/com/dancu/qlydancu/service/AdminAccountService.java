package com.dancu.qlydancu.service;

import com.dancu.qlydancu.dto.AdminAccountAssignRequest;
import com.dancu.qlydancu.dto.AdminAccountChangeApartmentRequest;
import com.dancu.qlydancu.dto.AdminAccountPageResponse;
import com.dancu.qlydancu.dto.AdminAccountResponse;
import com.dancu.qlydancu.dto.AdminAccountStatusPatchRequest;
import com.dancu.qlydancu.dto.AdminAccountUpsertRequest;
import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.OccupancyStatus;
import com.dancu.qlydancu.model.enums.ResidentCategory;
import com.dancu.qlydancu.model.enums.ResidentRelationship;
import com.dancu.qlydancu.model.enums.UserRole;
import com.dancu.qlydancu.model.enums.UserStatus;
import com.dancu.qlydancu.model.status.ApartmentStatus;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
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
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

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

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private ResidentRepository residentRepository;

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
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
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
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

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
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        user.setStatus(request.status.equalsIgnoreCase("ACTIVE") ? UserStatus.ACTIVE : UserStatus.BLOCKED);
        userRepository.save(user);
    }

    public void updateStatus(Long id, boolean isActive) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        user.setStatus(isActive ? UserStatus.ACTIVE : UserStatus.BLOCKED);
        userRepository.save(user);
    }

    public void deleteAccount(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        }
        userRepository.deleteById(id);
    }

    public void assignApartment(Long userId, AdminAccountAssignRequest request) {
        if (request == null || request.apartmentId == null || request.relationship == null || request.relationship.isBlank()) {
            throw new IllegalArgumentException("Thiếu thông tin gán căn hộ");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        if (residentRepository.findByUserId(user.getId()).isPresent()
                || householdRepository.findByUser_Id(user.getId()).isPresent()) {
            throw new IllegalArgumentException("Tài khoản này đã được gán vào 1 căn hộ.");
        }

        Apartment apartment = apartmentRepository.findById(request.apartmentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Căn hộ không tồn tại"));

        if (apartment.getStatus() != ApartmentStatus.EMPTY) {
            throw new IllegalArgumentException("Căn hộ này không còn trống.");
        }

        if (!residentRepository.findByApartmentId(apartment.getId()).isEmpty()) {
            throw new IllegalArgumentException("Căn hộ này đã có cư dân.");
        }

        Household existingHousehold = householdRepository.findByApartment_Code(apartment.getCode()).orElse(null);
        if (existingHousehold != null && existingHousehold.getUser() != null) {
            throw new IllegalArgumentException("Căn hộ này đã có chủ hộ.");
        }

        Household household = existingHousehold != null
                ? existingHousehold
                : householdRepository.findByApartment_Code(apartment.getCode())
                .orElseGet(() -> {
                    Household newHousehold = new Household();
                    newHousehold.setApartment(apartment);
                    newHousehold.setCreatedAt(LocalDateTime.now());
                    return householdRepository.save(newHousehold);
                });

        ResidentRelationship rel = ResidentRelationship.valueOf(request.relationship);

        if (rel == ResidentRelationship.HEAD) {
            List<Resident> residents = residentRepository.findByHouseholdId(household.getId());
            boolean hasHead = residents.stream().anyMatch(r -> r.getRelationship() == ResidentRelationship.HEAD);
            if (hasHead) {
                throw new IllegalArgumentException("Căn hộ này đã có chủ hộ. Vui lòng chọn vai trò khác.");
            }
            if (household.getUser() == null) {
                household.setUser(user);
                householdRepository.save(household);
            }
        }

        Resident resident = new Resident();
        resident.setName(user.getName());
        resident.setPhone(user.getUsername());
        resident.setHouseholdId(household.getId());
        resident.setRelationship(rel);
        resident.setResidentCategory(ResidentCategory.OFFICIAL);
        resident.setOccupancyStatus(OccupancyStatus.LIVING);
        residentRepository.save(resident);

        if (apartment.getStatus() != ApartmentStatus.OCCUPIED) {
            apartment.setStatus(ApartmentStatus.OCCUPIED);
            apartmentRepository.save(apartment);
        }
        
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    public void changeApartment(Long userId, AdminAccountChangeApartmentRequest request) {
        if (request == null || request.apartmentId == null) {
            throw new IllegalArgumentException("Thiếu thông tin chuyển căn hộ");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        Household currentHousehold = resolveUserHousehold(user.getId());
        if (currentHousehold == null || currentHousehold.getApartment() == null) {
            throw new IllegalArgumentException("Tài khoản chưa có căn hộ");
        }

        Apartment currentApartment = currentHousehold.getApartment();
        if (currentApartment.getId() != null && currentApartment.getId().equals(request.apartmentId)) {
            throw new IllegalArgumentException("Căn hộ mới trùng với căn hộ hiện tại");
        }

        Apartment newApartment = apartmentRepository.findById(request.apartmentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Căn hộ không tồn tại"));

        if (newApartment.getStatus() != ApartmentStatus.EMPTY) {
            throw new IllegalArgumentException("Căn hộ này không còn trống.");
        }

        if (!residentRepository.findByApartmentId(newApartment.getId()).isEmpty()) {
            throw new IllegalArgumentException("Căn hộ này đã có cư dân.");
        }

        Household existingNewHousehold = householdRepository.findByApartment_Code(newApartment.getCode()).orElse(null);
        if (existingNewHousehold != null && existingNewHousehold.getUser() != null) {
            throw new IllegalArgumentException("Căn hộ này đã có chủ hộ.");
        }

        Resident resident = residentRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản chưa có cư dân"));

        ResidentRelationship rel = resident.getRelationship();
        if (rel == null) {
            throw new IllegalArgumentException("Thiếu vai trò cư dân hiện tại");
        }

        Household newHousehold = existingNewHousehold != null
                ? existingNewHousehold
                : householdRepository.findByApartment_Code(newApartment.getCode())
                .orElseGet(() -> {
                    Household created = new Household();
                    created.setApartment(newApartment);
                    created.setCreatedAt(LocalDateTime.now());
                    return householdRepository.save(created);
                });

        if (rel == ResidentRelationship.HEAD) {
            List<Resident> residents = residentRepository.findByHouseholdId(newHousehold.getId());
            boolean hasHead = residents.stream().anyMatch(r -> r.getRelationship() == ResidentRelationship.HEAD);
            if (hasHead) {
                throw new IllegalArgumentException("Căn hộ này đã có chủ hộ.");
            }
            if (newHousehold.getUser() == null) {
                newHousehold.setUser(user);
                householdRepository.save(newHousehold);
            }
        }

        resident.setHouseholdId(newHousehold.getId());
        residentRepository.save(resident);

        if (currentHousehold.getUser() != null && currentHousehold.getUser().getId().equals(user.getId())) {
            currentHousehold.setUser(null);
            householdRepository.save(currentHousehold);
        }

        List<Resident> remaining = residentRepository.findByHouseholdId(currentHousehold.getId());
        if (remaining.isEmpty()) {
            currentApartment.setStatus(ApartmentStatus.EMPTY);
            apartmentRepository.save(currentApartment);
        }

        if (newApartment.getStatus() != ApartmentStatus.OCCUPIED) {
            newApartment.setStatus(ApartmentStatus.OCCUPIED);
            apartmentRepository.save(newApartment);
        }
    }

    public void removeApartment(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        Household currentHousehold = resolveUserHousehold(user.getId());
        if (currentHousehold == null || currentHousehold.getApartment() == null) {
            throw new IllegalArgumentException("Tài khoản chưa có căn hộ");
        }

        Apartment apartment = currentHousehold.getApartment();
        residentRepository.findByUserId(user.getId()).ifPresent(residentRepository::delete);

        if (currentHousehold.getUser() != null && currentHousehold.getUser().getId().equals(user.getId())) {
            currentHousehold.setUser(null);
            householdRepository.save(currentHousehold);
        }

        List<Resident> remaining = residentRepository.findByHouseholdId(currentHousehold.getId());
        if (remaining.isEmpty()) {
            apartment.setStatus(ApartmentStatus.EMPTY);
            apartmentRepository.save(apartment);
        }
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

        Household household = resolveUserHousehold(user.getId());
        if (household != null && household.getApartment() != null) {
            dto.apartmentCode = household.getApartment().getCode();
            dto.apartmentStatus = household.getApartment().getStatus() != null
                    ? household.getApartment().getStatus().name()
                    : null;
        }

        return dto;
    }

    private Household resolveUserHousehold(Long userId) {
        return residentRepository.findByUserId(userId)
                .flatMap(resident -> resident.getHouseholdId() != null
                        ? householdRepository.findById(resident.getHouseholdId())
                        : java.util.Optional.empty())
                .or(() -> householdRepository.findByUser_Id(userId))
                .orElse(null);
    }
}
