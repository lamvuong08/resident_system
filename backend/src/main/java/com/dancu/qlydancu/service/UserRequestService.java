package com.dancu.qlydancu.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.dancu.qlydancu.dto.UserRequestAttachmentDto;
import com.dancu.qlydancu.dto.UserRequestCreateRequest;
import com.dancu.qlydancu.dto.UserRequestResponse;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.UserRequest;
import com.dancu.qlydancu.model.enums.RequestStatus;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.repo.UserRequestRepository;

@Service
public class UserRequestService {

    private static final Set<String> ALLOWED_EXT = Set.of(".jpg", ".jpeg", ".png", ".pdf");
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final int MAX_FILES = 10;

    @Autowired
    private UserRequestRepository userRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.upload.user-requests-dir:uploads/user-requests}")
    private String userRequestsUploadDir;

    private Path baseUploadDir() {
        return Paths.get(userRequestsUploadDir).toAbsolutePath().normalize();
    }

    private Path resolveRequestDir(Long requestId) {
        return baseUploadDir().resolve(String.valueOf(requestId));
    }

    private void validateStoredFileName(String name) {
        if (name == null || name.isBlank() || name.contains("..") || name.contains("/") || name.contains("\\")) {
            throw new IllegalArgumentException("Tên tệp không hợp lệ.");
        }
    }

    private String extension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        if (dot < 0) return "";
        return filename.substring(dot).toLowerCase(Locale.ROOT);
    }

    private void validateFile(MultipartFile file) {
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Mỗi tệp tối đa 5MB.");
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String ext = extension(name);
        if (!ALLOWED_EXT.contains(ext)) {
            throw new IllegalArgumentException("Chỉ chấp nhận JPG, PNG hoặc PDF.");
        }
    }

    private List<UserRequestAttachmentDto> saveAttachmentsIfAny(Long requestId, MultipartFile[] files) throws IOException {
        if (files == null || files.length == 0) {
            return List.of();
        }
        long nonEmpty = java.util.Arrays.stream(files).filter(f -> f != null && !f.isEmpty()).count();
        if (nonEmpty > MAX_FILES) {
            throw new IllegalArgumentException("Tối đa " + MAX_FILES + " tệp đính kèm.");
        }
        Path dir = resolveRequestDir(requestId);
        Files.createDirectories(dir);
        List<UserRequestAttachmentDto> out = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            validateFile(file);
            String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String ext = extension(original);
            String stored = UUID.randomUUID() + ext;
            Path target = dir.resolve(stored).normalize();
            if (!target.startsWith(dir.normalize())) {
                throw new IllegalArgumentException("Tên tệp không hợp lệ.");
            }
            file.transferTo(target);
            String ct = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
            out.add(new UserRequestAttachmentDto(original, stored, ct, file.getSize()));
        }
        return out;
    }

    private void deleteSingleAttachmentFile(Long requestId, String storedFileName) {
        validateStoredFileName(storedFileName);
        Path base = resolveRequestDir(requestId).normalize();
        Path path = base.resolve(storedFileName).normalize();
        if (!path.startsWith(base)) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }

    private void deleteAttachmentDir(Long requestId) {
        try {
            Path dir = resolveRequestDir(requestId);
            if (Files.isDirectory(dir)) {
                Files.walk(dir)
                        .sorted(Comparator.reverseOrder())
                        .forEach(p -> {
                            try {
                                Files.deleteIfExists(p);
                            } catch (IOException ignored) {
                            }
                        });
            }
        } catch (IOException ignored) {
        }
    }

    private List<UserRequestAttachmentDto> parseAttachmentsJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<UserRequestAttachmentDto>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private UserRequestResponse toResponse(UserRequest req) {
        UserRequestResponse r = new UserRequestResponse(
                req.getId(),
                req.getType(),
                req.getDescription(),
                req.getStatus(),
                req.getCreatedAt());
        r.setAttachments(parseAttachmentsJson(req.getAttachmentsJson()));
        return r;
    }

    private Household requireHouseholdForEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));
        return householdRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Tài khoản chưa được liên kết hộ khẩu. Vui lòng hoàn tất hồ sơ hộ khẩu trước."));
    }

    @Transactional
    public UserRequestResponse createRequest(UserRequestCreateRequest dto, String email, MultipartFile[] files) {
        Household household = requireHouseholdForEmail(email);

        UserRequest userRequest = new UserRequest();
        userRequest.setHousehold(household);
        userRequest.setType(dto.getType());
        userRequest.setDescription(dto.getDescription());
        userRequest.setStatus(RequestStatus.PENDING);

        UserRequest savedRequest = userRequestRepository.save(userRequest);

        try {
            List<UserRequestAttachmentDto> metas = saveAttachmentsIfAny(savedRequest.getId(), files);
            if (!metas.isEmpty()) {
                savedRequest.setAttachmentsJson(objectMapper.writeValueAsString(metas));
                userRequestRepository.save(savedRequest);
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu tệp đính kèm.", e);
        }

        return toResponse(userRequestRepository.findById(savedRequest.getId()).orElse(savedRequest));
    }

    @Transactional(readOnly = true)
    public List<UserRequestResponse> getRequestHistory(String email) {
        Household household = requireHouseholdForEmail(email);

        List<UserRequest> requests = userRequestRepository.findByHouseholdIdOrderByCreatedAtDesc(household.getId());

        return requests.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<UserRequestResponse> getRequestHistory(String email, Pageable pageable) {
        Household household = requireHouseholdForEmail(email);

        Page<UserRequest> requestPage = userRequestRepository.findByHouseholdId(household.getId(), pageable);

        return requestPage.map(this::toResponse);
    }

    @Transactional
    public void deleteRequest(Long requestId, String email) {
        Household household = requireHouseholdForEmail(email);

        UserRequest request = userRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy yêu cầu với ID: " + requestId));

        if (!request.getHousehold().getId().equals(household.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa yêu cầu này.");
        }

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể xóa yêu cầu ở trạng thái Chờ xử lý.");
        }

        userRequestRepository.delete(request);
        deleteAttachmentDir(requestId);
    }

    @Transactional
    public UserRequestResponse updateRequest(
            Long requestId,
            UserRequestCreateRequest dto,
            String email,
            MultipartFile[] newFiles,
            String keepStoredFileNamesJson) {

        Household household = requireHouseholdForEmail(email);

        UserRequest request = userRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu: " + requestId));

        if (!request.getHousehold().getId().equals(household.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa yêu cầu này.");
        }

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Chỉ có thể chỉnh sửa yêu cầu đang ở trạng thái 'Chờ xử lý'.");
        }

        List<UserRequestAttachmentDto> current = parseAttachmentsJson(request.getAttachmentsJson());
        Set<String> allowedStored = current.stream()
                .map(UserRequestAttachmentDto::getStoredFileName)
                .collect(Collectors.toSet());

        Set<String> keepSet;
        if (keepStoredFileNamesJson == null || keepStoredFileNamesJson.isBlank()) {
            keepSet = new HashSet<>(allowedStored);
        } else {
            try {
                List<String> requested = objectMapper.readValue(keepStoredFileNamesJson, new TypeReference<List<String>>() {});
                keepSet = requested.stream()
                        .filter(allowedStored::contains)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
            } catch (Exception e) {
                throw new IllegalArgumentException("Danh sách tệp giữ lại không hợp lệ.");
            }
        }

        for (UserRequestAttachmentDto a : current) {
            if (!keepSet.contains(a.getStoredFileName())) {
                deleteSingleAttachmentFile(requestId, a.getStoredFileName());
            }
        }

        List<UserRequestAttachmentDto> kept = current.stream()
                .filter(a -> keepSet.contains(a.getStoredFileName()))
                .collect(Collectors.toList());

        MultipartFile[] safeNew = newFiles != null ? newFiles : new MultipartFile[0];
        long newNonEmpty = Arrays.stream(safeNew).filter(f -> f != null && !f.isEmpty()).count();
        if (kept.size() + newNonEmpty > MAX_FILES) {
            throw new IllegalArgumentException("Tối đa " + MAX_FILES + " tệp đính kèm.");
        }

        List<UserRequestAttachmentDto> added;
        try {
            added = saveAttachmentsIfAny(requestId, safeNew);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu tệp đính kèm.", e);
        }

        List<UserRequestAttachmentDto> merged = new ArrayList<>(kept);
        merged.addAll(added);

        request.setType(dto.getType());
        request.setDescription(dto.getDescription());
        try {
            if (merged.isEmpty()) {
                request.setAttachmentsJson(null);
            } else {
                request.setAttachmentsJson(objectMapper.writeValueAsString(merged));
            }
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu metadata tệp đính kèm.", e);
        }

        UserRequest updatedRequest = userRequestRepository.save(request);
        return toResponse(updatedRequest);
    }

    @Transactional(readOnly = true)
    public UserRequestAttachmentPayload getAttachmentPayload(Long requestId, String storedFileName, String email) {
        validateStoredFileName(storedFileName);

        Household household = requireHouseholdForEmail(email);

        UserRequest request = userRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu."));

        if (!request.getHousehold().getId().equals(household.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập tệp này.");
        }

        UserRequestAttachmentDto meta = parseAttachmentsJson(request.getAttachmentsJson()).stream()
                .filter(a -> storedFileName.equals(a.getStoredFileName()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tệp."));

        Path base = resolveRequestDir(requestId).normalize();
        Path path = base.resolve(storedFileName).normalize();
        if (!path.startsWith(base)) {
            throw new IllegalArgumentException("Tên tệp không hợp lệ.");
        }

        try {
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không đọc được tệp.");
            }
            return new UserRequestAttachmentPayload(resource, meta.getContentType(), meta.getOriginalName());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không đọc được tệp.", e);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getRequestStats(String email) {
        Household household = requireHouseholdForEmail(email);

        Long householdId = household.getId();

        long total = userRequestRepository.countByHouseholdId(householdId);
        long done = userRequestRepository.countByHouseholdIdAndStatus(householdId, RequestStatus.DONE);
        long pending = userRequestRepository.countByHouseholdIdAndStatus(householdId, RequestStatus.PENDING);
        long processing = userRequestRepository.countByHouseholdIdAndStatus(householdId, RequestStatus.PROCESSING);
        long rejected = userRequestRepository.countByHouseholdIdAndStatus(householdId, RequestStatus.REJECTED);

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("done", done);
        stats.put("processing", pending + processing);
        stats.put("rejected", rejected);

        return stats;
    }
}
