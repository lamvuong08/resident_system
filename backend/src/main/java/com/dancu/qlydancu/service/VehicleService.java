package com.dancu.qlydancu.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.Vehicle;
import com.dancu.qlydancu.model.enums.VehicleStatus;
import com.dancu.qlydancu.model.enums.VehicleType;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

@Service
public class VehicleService {

    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png");
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Value("${app.upload.vehicles-dir:uploads/vehicles}")
    private String vehicleUploadDir;

    private Household requireHouseholdForEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        return householdRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Tài khoản chưa được liên kết hộ khẩu. Vui lòng hoàn tất hồ sơ hộ khẩu trước."));
    }

    private Path baseUploadDir() {
        return Paths.get(vehicleUploadDir).toAbsolutePath().normalize();
    }

    private Path resolveVehicleDir(Long vehicleId) {
        return baseUploadDir().resolve(String.valueOf(vehicleId)).normalize();
    }

    private String extension(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0) {
            return "";
        }
        return filename.substring(dot).toLowerCase(Locale.ROOT);
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Bắt buộc phải có ít nhất 1 ảnh xe.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Mỗi ảnh tối đa 5MB.");
        }
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Chỉ cho phép ảnh JPG hoặc PNG.");
        }
        String ext = extension(file.getOriginalFilename());
        if (!ALLOWED_IMAGE_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Chỉ cho phép ảnh JPG hoặc PNG.");
        }
    }

    private Map<String, Object> toAttachmentMap(Vehicle vehicle) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", vehicle.getId());
        map.put("fileUrl", vehicle.getFileUrl());
        map.put("createdAt", vehicle.getFileCreatedAt() != null ? vehicle.getFileCreatedAt() : vehicle.getCreatedAt());
        return map;
    }

    private List<Map<String, Object>> getAttachmentMaps(Vehicle vehicle) {
        if (vehicle.getFileUrl() == null || vehicle.getFileUrl().isBlank()) {
            return List.of();
        }
        return List.of(toAttachmentMap(vehicle));
    }

    private Map<String, Object> saveVehicleFile(Vehicle vehicle, MultipartFile file) throws IOException {
        validateImage(file);

        Path vehicleDir = resolveVehicleDir(vehicle.getId());
        Files.createDirectories(vehicleDir);

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "vehicle-image";
        String storedName = UUID.randomUUID() + extension(originalName);
        Path target = vehicleDir.resolve(storedName).normalize();
        if (!target.startsWith(vehicleDir)) {
            throw new IllegalArgumentException("Đường dẫn tệp không hợp lệ.");
        }

        file.transferTo(target);

        Map<String, Object> stored = new HashMap<>();
        stored.put("fileUrl", "/uploads/vehicles/" + vehicle.getId() + "/" + storedName);
        stored.put("createdAt", LocalDateTime.now());
        return stored;
    }

    private void deleteVehicleFiles(Long vehicleId) {
        try {
            Path dir = resolveVehicleDir(vehicleId);
            if (!Files.exists(dir)) {
                return;
            }
            Files.walk(dir)
                    .sorted((left, right) -> right.compareTo(left))
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ignored) {
                        }
                    });
        } catch (IOException ignored) {
        }
    }

    private Map<String, Object> toResponseMap(Vehicle vehicle) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", vehicle.getId());
        map.put("licensePlate", vehicle.getLicensePlate());
        map.put("type", vehicle.getType() != null ? vehicle.getType().name() : "");
        map.put("status", vehicle.getStatus() != null ? vehicle.getStatus().name() : "PENDING");
        map.put("createdAt", vehicle.getCreatedAt());

        List<Map<String, Object>> attachments = getAttachmentMaps(vehicle);
        map.put("attachments", attachments);
        map.put("thumbnailUrl", vehicle.getFileUrl());

        Map<String, String> residentMap = new HashMap<>();
        if (vehicle.getHousehold() != null) {
            if (vehicle.getHousehold().getUser() != null) {
                residentMap.put("name", vehicle.getHousehold().getUser().getName());
            } else {
                residentMap.put("name", "N/A");
            }
            if (vehicle.getHousehold().getApartment() != null) {
                residentMap.put("apartment", vehicle.getHousehold().getApartment().getCode());
            } else {
                residentMap.put("apartment", "N/A");
            }
        }
        map.put("resident", residentMap);

        return map;
    }

    @Transactional
    public Map<String, Object> createVehicle(String email, String licensePlate, VehicleType type, MultipartFile file) {
        Household household = requireHouseholdForEmail(email);

        String normalizedPlate = licensePlate != null ? licensePlate.trim() : "";
        if (normalizedPlate.isEmpty()) {
            throw new IllegalArgumentException("Biển số xe không được để trống.");
        }
        if (type == null) {
            throw new IllegalArgumentException("Loại phương tiện không hợp lệ.");
        }

        if (vehicleRepository.existsByLicensePlate(normalizedPlate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Biển số xe này đã được đăng ký trong hệ thống!");
        }

        Vehicle vehicle = new Vehicle();
        vehicle.setHousehold(household);
        vehicle.setLicensePlate(normalizedPlate);
        vehicle.setType(type);
        vehicle.setStatus(VehicleStatus.PENDING);
        vehicle.setCreatedAt(LocalDateTime.now());

        Vehicle saved = vehicleRepository.save(vehicle);
        try {
            Map<String, Object> stored = saveVehicleFile(saved, file);
            saved.setFileUrl((String) stored.get("fileUrl"));
            saved.setFileCreatedAt((LocalDateTime) stored.get("createdAt"));
            saved = vehicleRepository.save(saved);
        } catch (IOException ex) {
            deleteVehicleFiles(saved.getId());
            vehicleRepository.delete(saved);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu ảnh phương tiện.");
        }
        return toResponseMap(saved);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getVehiclesByHousehold(String email) {
        Household household = requireHouseholdForEmail(email);
        return vehicleRepository.findByHousehold_Id(household.getId())
                .stream().map(this::toResponseMap).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAllVehicles(String search, String status, Pageable pageable) {
        VehicleStatus qStatus = null;
        if (status != null && !status.equalsIgnoreCase("ALL")) {
            try {
                qStatus = VehicleStatus.valueOf(status.toUpperCase());
            } catch (Exception e) {}
        }
        VehicleStatus finalQStatus = qStatus;
        String finalQSearch = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;

        Specification<Vehicle> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (finalQStatus != null) {
                predicates.add(cb.equal(root.get("status"), finalQStatus));
            }
            if (finalQSearch != null) {
                String pattern = "%" + finalQSearch + "%";
                Predicate lpPred = cb.like(cb.lower(root.get("licensePlate")), pattern);
                
                Join<Vehicle, Household> householdJoin = root.join("household", JoinType.LEFT);
                Join<Household, User> userJoin = householdJoin.join("user", JoinType.LEFT);
                Predicate namePred = cb.like(cb.lower(userJoin.get("name")), pattern);
                
                predicates.add(cb.or(lpPred, namePred));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Vehicle> page = vehicleRepository.findAll(spec, pageable);
        List<Map<String, Object>> items = page.getContent().stream().map(this::toResponseMap).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("totalPages", page.getTotalPages());
        result.put("totalElements", page.getTotalElements());
        return result;
    }

    @Transactional
    public Map<String, Object> updateStatus(Long id, VehicleStatus status) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phương tiện."));
        if (status != VehicleStatus.ACTIVE && status != VehicleStatus.REJECTED) {
            throw new IllegalArgumentException("Chỉ chấp nhận ACTIVE hoặc REJECTED.");
        }
        vehicle.setStatus(status);
        return toResponseMap(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void deleteVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phương tiện."));
        deleteVehicleFiles(id);
        vehicleRepository.delete(vehicle);
    }
}
