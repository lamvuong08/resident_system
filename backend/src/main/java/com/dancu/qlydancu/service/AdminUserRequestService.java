package com.dancu.qlydancu.service;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.dancu.qlydancu.dto.UserRequestAttachmentDto;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.UserRequest;
import com.dancu.qlydancu.model.enums.RequestStatus;
import com.dancu.qlydancu.model.enums.RequestType;
import com.dancu.qlydancu.repo.UserRequestRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AdminUserRequestService {

    @Autowired
    private UserRequestRepository userRequestRepository;

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

    @Transactional(readOnly = true)
    public Map<String, Object> getRequests(String search, String type, String status, Pageable pageable) {
        RequestStatus qStatus = null;
        if (status != null && !status.equalsIgnoreCase("ALL")) {
            if (status.equalsIgnoreCase("IN_PROGRESS")) {
                qStatus = RequestStatus.PROCESSING;
            } else if (status.equalsIgnoreCase("COMPLETED")) {
                qStatus = RequestStatus.DONE;
            } else {
                try {
                    qStatus = RequestStatus.valueOf(status.toUpperCase());
                } catch (Exception e) {}
            }
        }

        RequestStatus finalQStatus = qStatus;
        RequestType qType = null;
        if (type != null && !type.equalsIgnoreCase("ALL")) {
            try {
                qType = RequestType.valueOf(type.toUpperCase());
            } catch (Exception e) {}
        }
        RequestType finalQType = qType;

        String qSearch = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;

        String finalQSearch = qSearch;
        Specification<UserRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (finalQStatus != null) {
                predicates.add(cb.equal(root.get("status"), finalQStatus));
            }
            if (finalQType != null) {
                predicates.add(cb.equal(root.get("type"), finalQType));
            }
            if (finalQSearch != null) {
                String searchPattern = "%" + finalQSearch + "%";
                Predicate idPred = cb.like(root.get("id").as(String.class), searchPattern);
                Predicate descPred = cb.like(cb.lower(root.get("description")), searchPattern);
                
                Join<UserRequest, Household> householdJoin = root.join("household", JoinType.LEFT);
                Join<Household, User> userJoin = householdJoin.join("user", JoinType.LEFT);
                Predicate namePred = cb.like(cb.lower(userJoin.get("name")), searchPattern);
                
                predicates.add(cb.or(idPred, descPred, namePred));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<UserRequest> page = userRequestRepository.findAll(spec, pageable);

        List<Map<String, Object>> items = page.getContent().stream().map(this::toResponseMap).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("totalPages", page.getTotalPages());
        result.put("totalElements", page.getTotalElements());
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRequest(Long id) {
        UserRequest request = userRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu"));
        return toResponseMap(request);
    }

    @Transactional(readOnly = true)
    public UserRequestAttachmentPayload getAttachmentPayload(Long requestId, String storedFileName) {
        validateStoredFileName(storedFileName);

        UserRequest request = userRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu."));

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

    @Transactional
    public Map<String, Object> updateStatus(Long id, String action, String reason) {
        UserRequest request = userRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu"));

        if ("PROCESSING".equals(action)) {
            if (request.getStatus() != RequestStatus.PENDING) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu phải đang ở trạng thái PENDING");
            }
            request.setStatus(RequestStatus.PROCESSING);
        } else if ("DONE".equals(action)) {
            if (request.getStatus() != RequestStatus.PROCESSING) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu phải đang ở trạng thái IN_PROGRESS");
            }
            request.setStatus(RequestStatus.DONE);
        } else if ("REJECTED".equals(action)) {
            if (request.getStatus() == RequestStatus.DONE || request.getStatus() == RequestStatus.REJECTED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể từ chối yêu cầu này");
            }
            request.setStatus(RequestStatus.REJECTED);
            if (reason != null && !reason.trim().isEmpty()) {
                request.setDescription(request.getDescription() + "\n[Lý do từ chối]: " + reason);
            }
        }

        userRequestRepository.save(request);
        return toResponseMap(request);
    }

    private Map<String, Object> toResponseMap(UserRequest req) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", req.getId());

        map.put("type", req.getType() != null ? req.getType().name() : "");
        map.put("title", "Yêu cầu " + (req.getType() != null ? req.getType().name() : ""));
        map.put("content", req.getDescription());

        String statusStr = req.getStatus() != null ? req.getStatus().name() : "PENDING";
        if ("PROCESSING".equals(statusStr)) {
            statusStr = "IN_PROGRESS";
        } else if ("DONE".equals(statusStr)) {
            statusStr = "COMPLETED";
        }
        map.put("status", statusStr);
        map.put("createdAt", req.getCreatedAt());

        Map<String, String> residentMap = new HashMap<>();
        if (req.getHousehold() != null && req.getHousehold().getUser() != null) {
            residentMap.put("name", req.getHousehold().getUser().getName());
        } else {
            residentMap.put("name", "N/A");
        }
        
        if (req.getHousehold() != null && req.getHousehold().getApartment() != null) {
            residentMap.put("apartment", req.getHousehold().getApartment().getCode());
        } else {
            residentMap.put("apartment", "N/A");
        }
        
        map.put("resident", residentMap);

        List<UserRequestAttachmentDto> attachments = parseAttachmentsJson(req.getAttachmentsJson()).stream()
                .peek(att -> {
                    String baseUrl = "/api/admin/requests/" + req.getId() + "/attachments/" + att.getStoredFileName();
                    att.setPreviewUrl(baseUrl);
                    att.setDownloadUrl(baseUrl);
                })
                .collect(Collectors.toList());
        map.put("attachments", attachments);

        return map;
    }
}
