package com.dancu.qlydancu.service;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.model.enums.UserRole;
import com.dancu.qlydancu.model.enums.UserStatus;
import com.dancu.qlydancu.model.enums.AssignmentMethod;
import com.dancu.qlydancu.model.enums.AssignmentAction;
import com.dancu.qlydancu.model.RequestAssignmentHistory;
import com.dancu.qlydancu.repo.RequestAssignmentHistoryRepository;
import com.dancu.qlydancu.dto.AssignableStaffResponse;
import com.dancu.qlydancu.dto.RequestAssignmentRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AdminUserRequestService {

    @Autowired
    private UserRequestRepository userRequestRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RequestAssignmentHistoryRepository assignmentHistoryRepository;

    private User requireAdmin(String email) {
        User actor = requireActor(email);
        if (!isAdmin(actor)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ ADMIN được phân công công việc.");
        return actor;
    }

    private static String displayName(User user) {
        if (user.getName() != null && !user.getName().isBlank()) return user.getName();
        return user.getUsername() != null && !user.getUsername().isBlank() ? user.getUsername() : "Nhân viên";
    }

    private void recordAssignment(UserRequest request, User previous, User target, User actor, AssignmentAction action, String reason) {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        request.setAssignedStaff(target);
        request.setAssignedBy(actor);
        request.setAssignedAt(now);
        request.setAssignmentMethod(action == AssignmentAction.SELF_CLAIM ? AssignmentMethod.SELF_CLAIM : AssignmentMethod.ADMIN_ASSIGNED);
        assignmentHistoryRepository.save(new RequestAssignmentHistory(request, previous, target, actor, action, now, reason));
    }

    @Transactional(readOnly = true)
    public List<AssignableStaffResponse> getAssignableStaff(String email) {
        requireAdmin(email);
        Map<Long, UserRequestRepository.StaffWorkload> workloads = userRequestRepository.getStaffWorkloads(
                List.of(RequestStatus.PENDING, RequestStatus.ASSIGNED, RequestStatus.PROCESSING), RequestStatus.PROCESSING)
                .stream().collect(Collectors.toMap(UserRequestRepository.StaffWorkload::getStaffId, row -> row));
        return userRepository.findByRolesAndStatus(UserRole.ROLE_STAFF, UserStatus.ACTIVE).stream().map(staff -> {
            var workload = workloads.get(staff.getId());
            long total = workload == null ? 0 : workload.getUnfinishedCount();
            long processing = workload == null ? 0 : workload.getProcessingCount();
            return new AssignableStaffResponse(staff.getId(), displayName(staff), total, total - processing, processing);
        }).sorted(java.util.Comparator.comparingLong(AssignableStaffResponse::unfinishedCount)
                .thenComparing(AssignableStaffResponse::name, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(AssignableStaffResponse::id)).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAssignmentHistory(Long id, String email) {
        requireAdmin(email);
        if (!userRequestRepository.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu.");
        return assignmentHistoryRepository.findByRequest_IdOrderByIdAsc(id).stream().map(history -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", history.getId());
            row.put("previousStaff", history.getPreviousStaff() == null ? null : Map.of("id", history.getPreviousStaff().getId(), "name", displayName(history.getPreviousStaff())));
            row.put("newStaff", Map.of("id", history.getNewStaff().getId(), "name", displayName(history.getNewStaff())));
            row.put("actor", Map.of("id", history.getActor().getId(), "name", displayName(history.getActor())));
            row.put("action", history.getAction());
            row.put("createdAt", history.getCreatedAt());
            row.put("reason", history.getReason());
            return row;
        }).toList();
    }

    @Transactional
    public Map<String, Object> assign(Long id, RequestAssignmentRequest dto, boolean transfer, String email) {
        User actor = requireAdmin(email);
        UserRequest request = userRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu."));
        User previous = request.getAssignedStaff();
        if (transfer) {
            if (previous == null || (request.getStatus() != RequestStatus.ASSIGNED && request.getStatus() != RequestStatus.PROCESSING)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Yêu cầu không còn cho phép chuyển giao.");
            }
            if (dto.reason() == null || dto.reason().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do chuyển giao.");
            if (dto.expectedStaffId() == null || !previous.getId().equals(dto.expectedStaffId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Người phụ trách đã thay đổi. Vui lòng tải lại yêu cầu.");
            }
            if (previous.getId().equals(dto.staffId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn nhân viên khác.");
        } else if (!isUnclaimed(request)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Yêu cầu đã được tiếp nhận hoặc không còn cho phép phân công.");
        }
        if (dto.staffId() == null || dto.staffId() <= 0 || (dto.reason() != null && dto.reason().length() > 2000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dữ liệu phân công không hợp lệ.");
        }
        User target = userRepository.findById(dto.staffId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên."));
        if (target.getRoles() != UserRole.ROLE_STAFF || target.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài khoản được chọn phải là STAFF đang hoạt động.");
        }
        recordAssignment(request, previous, target, actor, transfer ? AssignmentAction.ADMIN_REASSIGN : AssignmentAction.ADMIN_ASSIGN,
                transfer ? dto.reason() : null);
        request.setStatus(RequestStatus.ASSIGNED);
        userRequestRepository.save(request);
        String category = (request.getType() != null ? request.getType() : RequestType.SUPPORT).getDisplayName().toLowerCase(Locale.ROOT);
        String apartment = request.getHousehold() != null && request.getHousehold().getApartment() != null
                ? request.getHousehold().getApartment().getCode() : null;
        String subject = "yêu cầu " + category + (apartment != null && !apartment.isBlank() ? " từ căn hộ " + apartment : "");
        notificationService.sendNotificationToUser(target, "Bạn được phân công công việc",
                "Bạn được phân công xử lý " + subject + ". Vui lòng bắt đầu xử lý khi sẵn sàng.",
                com.dancu.qlydancu.model.enums.NotificationType.GENERAL, "/staff/requests?requestId=" + id, "REQUEST_ASSIGNED");
        if (transfer) {
            String destination = previous.getRoles() == UserRole.ROLE_ADMIN ? "/admin/requests?requestId=" + id : "/staff/requests";
            notificationService.sendNotificationToUser(previous, "Công việc đã được chuyển giao",
                    "Ban quản lý đã chuyển giao " + subject + " cho nhân viên khác.",
                    com.dancu.qlydancu.model.enums.NotificationType.GENERAL, destination, "REQUEST_REASSIGNED_AWAY");
        }
        notificationService.notifyRequestListsChanged();
        return toResponseMap(request, actor);
    }

    private User requireActor(String email) {
        User actor = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập."));
        if (actor.getStatus() == UserStatus.BLOCKED ||
                (actor.getRoles() != UserRole.ROLE_ADMIN && actor.getRoles() != UserRole.ROLE_STAFF)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xử lý yêu cầu.");
        }
        return actor;
    }

    private boolean isAdmin(User actor) { return actor.getRoles() == UserRole.ROLE_ADMIN; }
    private boolean isOwner(UserRequest request, User actor) {
        return request.getAssignedStaff() != null && actor.getId().equals(request.getAssignedStaff().getId());
    }
    private boolean isUnclaimed(UserRequest request) {
        return request.getStatus() == RequestStatus.PENDING && request.getAssignedStaff() == null;
    }
    private void requireVisible(UserRequest request, User actor) {
        if (!isAdmin(actor) && !isOwner(request, actor) && !isUnclaimed(request)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Yêu cầu đang thuộc phạm vi xử lý của nhân viên khác.");
        }
    }

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
    public Map<String, Object> getRequests(String search, String type, String status, Pageable pageable, String email) {
        User actor = requireActor(email);
        boolean mine = "MINE".equals(status);
        if (mine) status = "ALL";
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
            if (mine) {
                predicates.add(cb.equal(root.get("assignedStaff").get("id"), actor.getId()));
                predicates.add(root.get("status").in(RequestStatus.ASSIGNED, RequestStatus.PROCESSING));
            }
            if (!isAdmin(actor)) {
                predicates.add(cb.or(
                        cb.and(cb.equal(root.get("status"), RequestStatus.PENDING), cb.isNull(root.get("assignedStaff"))),
                        cb.equal(root.get("assignedStaff").get("id"), actor.getId())));
                if (finalQStatus == RequestStatus.PENDING) predicates.add(cb.isNull(root.get("assignedStaff")));
            }
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

        List<Map<String, Object>> items = page.getContent().stream().map(req -> toResponseMap(req, actor)).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("totalPages", page.getTotalPages());
        result.put("totalElements", page.getTotalElements());
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRequest(Long id, String email) {
        User actor = requireActor(email);
        UserRequest request = userRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu"));
        requireVisible(request, actor);
        return toResponseMap(request, actor);
    }

    @Transactional(readOnly = true)
    public UserRequestAttachmentPayload getAttachmentPayload(Long requestId, String storedFileName, String email) {
        User actor = requireActor(email);
        validateStoredFileName(storedFileName);

        UserRequest request = userRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu."));
        requireVisible(request, actor);

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
    public Map<String, Object> updateStatus(Long id, String action, String reason, String email) {
        User actor = requireActor(email);
        UserRequest request = userRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu"));

        boolean startingAssigned = "START".equals(action);
        boolean startsWork = "PROCESSING".equals(action) || startingAssigned;
        if (startsWork) {
            if (startingAssigned && !isOwner(request, actor)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ nhân viên được giao được bắt đầu xử lý.");
            }
            if ((startingAssigned && request.getStatus() != RequestStatus.ASSIGNED) || (!startingAssigned && !isUnclaimed(request))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Yêu cầu đã được tiếp nhận hoặc không còn cho phép nhận xử lý.");
            }
            if (!startingAssigned) recordAssignment(request, null, actor, actor, AssignmentAction.SELF_CLAIM, null);
            if (request.getAcceptedAt() == null) request.setAcceptedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
            request.setStatus(RequestStatus.PROCESSING);
        } else if ("DONE".equals(action)) {
            if (!isAdmin(actor) && !isOwner(request, actor)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ nhân viên phụ trách được hoàn thành yêu cầu.");
            }
            if (request.getStatus() != RequestStatus.PROCESSING) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Yêu cầu không còn ở trạng thái đang xử lý.");
            }
            request.setStatus(RequestStatus.DONE);
            request.setCompletedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        } else if ("REJECTED".equals(action)) {
            if (!isAdmin(actor) && !isOwner(request, actor)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ nhân viên phụ trách được từ chối yêu cầu đã nhận.");
            }
            if (request.getStatus() == RequestStatus.DONE || request.getStatus() == RequestStatus.REJECTED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể từ chối yêu cầu đã kết thúc.");
            }
            request.setStatus(RequestStatus.REJECTED);
            if (reason != null && !reason.trim().isEmpty()) {
                request.setDescription(request.getDescription() + "\n[Lý do từ chối]: " + reason);
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thao tác không hợp lệ.");
        }

        userRequestRepository.save(request);

        if (request.getHousehold() != null && request.getHousehold().getUser() != null) {
            String title = "";
            String content = "";
            String eventType = "";
            if (startsWork) {
                RequestNotificationContent wording = RequestNotificationContent.processing(request.getType());
                title = wording.title();
                content = wording.content();
                eventType = "REQUEST_PROCESSING";
            } else if ("DONE".equals(action)) {
                RequestNotificationContent wording = RequestNotificationContent.done(request.getType());
                title = wording.title();
                content = wording.content();
                eventType = "REQUEST_DONE";
            } else if ("REJECTED".equals(action)) {
                RequestNotificationContent wording = RequestNotificationContent.rejected(reason);
                title = wording.title();
                content = wording.content();
                eventType = "REQUEST_REJECTED";
            }

            if (!title.isEmpty()) {
                notificationService.sendNotificationToUser(
                        request.getHousehold().getUser(),
                        title,
                        content,
                        com.dancu.qlydancu.model.enums.NotificationType.GENERAL,
                        "/user/requests",
                        eventType
                );
            }
        }

        if (actor.getRoles() == UserRole.ROLE_STAFF && (startsWork || "DONE".equals(action))) {
            String name = displayName(actor);
            String category = (request.getType() != null ? request.getType() : RequestType.SUPPORT)
                    .getDisplayName().toLowerCase(Locale.ROOT);
            String apartment = request.getHousehold() != null && request.getHousehold().getApartment() != null
                    ? request.getHousehold().getApartment().getCode() : null;
            boolean accepted = startsWork;
            String content = name + (accepted ? (startingAssigned ? " đã bắt đầu xử lý yêu cầu " : " đã tiếp nhận yêu cầu ") : " đã hoàn thành yêu cầu ") + category
                    + (apartment != null && !apartment.isBlank() ? (accepted ? " từ căn hộ " : " tại căn hộ ") + apartment : "")
                    + (accepted ? ". Trạng thái: Đang xử lý." : ". Trạng thái: Hoàn thành.");
            notificationService.sendNotificationToRole(UserRole.ROLE_ADMIN,
                    accepted ? (startingAssigned ? "Nhân viên bắt đầu xử lý yêu cầu" : "Nhân viên đã tiếp nhận yêu cầu") : "Nhân viên đã hoàn thành công việc",
                    content, com.dancu.qlydancu.model.enums.NotificationType.GENERAL,
                    "/admin/requests?requestId=" + request.getId(), accepted ? (startingAssigned ? "STAFF_REQUEST_STARTED" : "STAFF_REQUEST_ACCEPTED") : "STAFF_REQUEST_COMPLETED");
        }
        notificationService.notifyRequestListsChanged();
        return toResponseMap(request, actor);
    }

    private Map<String, Object> toResponseMap(UserRequest req, User actor) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", req.getId());

        map.put("type", req.getType() != null ? req.getType().name() : "");
        map.put("title", "Yêu cầu " + (req.getType() != null ? req.getType().getDisplayName().toLowerCase(Locale.ROOT) : "hỗ trợ"));
        map.put("content", req.getDescription());

        String statusStr = req.getStatus() != null ? req.getStatus().name() : "PENDING";
        if ("PROCESSING".equals(statusStr)) {
            statusStr = "IN_PROGRESS";
        } else if ("DONE".equals(statusStr)) {
            statusStr = "COMPLETED";
        }
        map.put("status", statusStr);
        map.put("createdAt", req.getCreatedAt());
        map.put("assignedStaff", req.getAssignedStaff() == null ? null : Map.of(
                "id", req.getAssignedStaff().getId(),
                "name", displayName(req.getAssignedStaff())));
        map.put("assignedBy", req.getAssignedBy() == null ? null : Map.of("id", req.getAssignedBy().getId(), "name", displayName(req.getAssignedBy())));
        map.put("assignedAt", req.getAssignedAt());
        map.put("assignmentMethod", req.getAssignmentMethod());
        map.put("acceptedAt", req.getAcceptedAt());
        map.put("completedAt", req.getCompletedAt());
        map.put("canAccept", isUnclaimed(req));
        map.put("canStart", req.getStatus() == RequestStatus.ASSIGNED && isOwner(req, actor));
        map.put("canAssign", isAdmin(actor) && isUnclaimed(req));
        map.put("canReassign", isAdmin(actor) && req.getAssignedStaff() != null &&
                (req.getStatus() == RequestStatus.ASSIGNED || req.getStatus() == RequestStatus.PROCESSING));
        map.put("canComplete", req.getStatus() == RequestStatus.PROCESSING && (isAdmin(actor) || isOwner(req, actor)));
        map.put("canReject", (req.getStatus() == RequestStatus.PENDING || req.getStatus() == RequestStatus.ASSIGNED || req.getStatus() == RequestStatus.PROCESSING)
                && (isAdmin(actor) || isOwner(req, actor)));

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
