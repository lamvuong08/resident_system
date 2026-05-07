package com.dancu.qlydancu.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        @Autowired
        private UserRequestRepository userRequestRepository;

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private HouseholdRepository householdRepository;

        @Transactional
        public UserRequestResponse createRequest(UserRequestCreateRequest dto, String email) {
                // 1. Tìm thông tin User từ email
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + email));

                // 2. Tìm hộ khẩu (Household) mà User này quản lý/thuộc về
                // Dựa trên db_qldc.sql: households có cột user_id
                Household household = householdRepository.findByUser_Id(user.getId())
                                .orElseThrow(() -> new RuntimeException(
                                                "Tài khoản chưa được liên kết với hộ khẩu nào."));

                // 3. Khởi tạo Entity UserRequest và gán dữ liệu
                UserRequest userRequest = new UserRequest();
                userRequest.setHousehold(household);
                userRequest.setType(dto.getType());
                userRequest.setDescription(dto.getDescription());
                userRequest.setStatus(RequestStatus.PENDING);

                // 4. Lưu vào Database
                UserRequest savedRequest = userRequestRepository.save(userRequest);

                // 5. Chuyển đổi sang Response DTO để trả về Frontend
                return new UserRequestResponse(
                                savedRequest.getId(),
                                savedRequest.getType(),
                                savedRequest.getDescription(),
                                savedRequest.getStatus(),
                                savedRequest.getCreatedAt());
        }

        @Transactional(readOnly = true)
        public List<UserRequestResponse> getRequestHistory(String email) {
                // 1. Tìm thông tin User
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

                // 2. Tìm Household của User
                Household household = householdRepository.findByUser_Id(user.getId())
                                .orElseThrow(() -> new RuntimeException("Tài khoản chưa được liên kết hộ khẩu."));

                // 3. Lấy danh sách Request theo householdId và sắp xếp mới nhất lên đầu
                List<UserRequest> requests = userRequestRepository
                                .findByHouseholdIdOrderByCreatedAtDesc(household.getId());

                // 4. Map sang DTO Response
                return requests.stream().map(req -> new UserRequestResponse(
                                req.getId(),
                                req.getType(),
                                req.getDescription(),
                                req.getStatus(),
                                req.getCreatedAt())).collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public Page<UserRequestResponse> getRequestHistory(String email, Pageable pageable) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

                Household household = householdRepository.findByUser_Id(user.getId())
                                .orElseThrow(() -> new RuntimeException("Tài khoản chưa được liên kết hộ khẩu."));

                // Lấy dữ liệu phân trang từ DB
                Page<UserRequest> requestPage = userRequestRepository.findByHouseholdId(household.getId(), pageable);

                // Map sang DTO Page
                return requestPage.map(req -> new UserRequestResponse(
                                req.getId(),
                                req.getType(),
                                req.getDescription(),
                                req.getStatus(),
                                req.getCreatedAt()));
        }

        @Transactional
        public void deleteRequest(Long requestId, String email) {
                // 1. Tìm User từ email
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

                // 2. Tìm Household của User
                Household household = householdRepository.findByUser_Id(user.getId())
                                .orElseThrow(() -> new RuntimeException("Tài khoản chưa được liên kết hộ khẩu."));

                // 3. Tìm Request cần xóa
                UserRequest request = userRequestRepository.findById(requestId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu với ID: " + requestId));

                // 4. KIỂM TRA BẢO MẬT: Request này có thuộc về Hộ khẩu của User này không?
                if (!request.getHousehold().getId().equals(household.getId())) {
                        throw new RuntimeException("Bạn không có quyền xóa yêu cầu này.");
                }

                // 5. KIỂM TRA TRẠNG THÁI: Chỉ được xóa khi còn đang PENDING
                if (request.getStatus() != RequestStatus.PENDING) {
                        throw new RuntimeException("Chỉ có thể xóa yêu cầu ở trạng thái Chờ xử lý.");
                }

                // 6. Thực hiện xóa khỏi Database
                userRequestRepository.delete(request);
        }

        @Transactional
        public UserRequestResponse updateRequest(Long requestId, UserRequestCreateRequest dto, String email) {
                // 1. Tìm thông tin User và Household
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

                Household household = householdRepository.findByUser_Id(user.getId())
                                .orElseThrow(() -> new RuntimeException("Tài khoản chưa được liên kết hộ khẩu."));

                // 2. Tìm yêu cầu cần sửa
                UserRequest request = userRequestRepository.findById(requestId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu: " + requestId));

                // 3. Kiểm tra bảo mật: Đúng chủ sở hữu mới được sửa
                if (!request.getHousehold().getId().equals(household.getId())) {
                        throw new RuntimeException("Bạn không có quyền chỉnh sửa yêu cầu này.");
                }

                // 4. Kiểm tra trạng thái: Chỉ cho phép sửa khi đang PENDING
                if (request.getStatus() != com.dancu.qlydancu.model.enums.RequestStatus.PENDING) {
                        throw new RuntimeException("Chỉ có thể chỉnh sửa yêu cầu đang ở trạng thái 'Chờ xử lý'.");
                }

                // 5. Cập nhật dữ liệu mới
                request.setType(dto.getType());
                request.setDescription(dto.getDescription());

                // 6. Lưu và trả về DTO
                UserRequest updatedRequest = userRequestRepository.save(request);
                return new UserRequestResponse(
                                updatedRequest.getId(),
                                updatedRequest.getType(),
                                updatedRequest.getDescription(),
                                updatedRequest.getStatus(),
                                updatedRequest.getCreatedAt());
        }

        @Transactional(readOnly = true)
        public Map<String, Long> getRequestStats(String email) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

                Household household = householdRepository.findByUser_Id(user.getId())
                                .orElseThrow(() -> new RuntimeException("Tài khoản chưa được liên kết hộ khẩu."));

                Long householdId = household.getId();

                long total = userRequestRepository.countByHouseholdId(householdId);
                long done = userRequestRepository.countByHouseholdIdAndStatus(householdId, RequestStatus.DONE);
                long pending = userRequestRepository.countByHouseholdIdAndStatus(householdId, RequestStatus.PENDING);
                long processing = userRequestRepository.countByHouseholdIdAndStatus(householdId,
                                RequestStatus.PROCESSING);
                long rejected = userRequestRepository.countByHouseholdIdAndStatus(householdId, RequestStatus.REJECTED);

                Map<String, Long> stats = new HashMap<>();
                stats.put("total", total);
                stats.put("done", done);
                stats.put("processing", pending + processing); // Gộp Chờ xử lý và Đang xử lý
                stats.put("rejected", rejected);

                return stats;
        }

        @Transactional(readOnly = true)
        public Page<UserRequestResponse> getAllRequestsWithDetails(String apartmentCode, Pageable pageable) {
                // Gọi hàm mới từ Repository
                Page<UserRequest> requestPage = userRequestRepository.findRequestsByApartmentCode(apartmentCode,
                                pageable);

                return requestPage.map(req -> {
                        String aptCode = (req.getHousehold() != null && req.getHousehold().getApartment() != null)
                                        ? req.getHousehold().getApartment().getCode()
                                        : null;

                        return new UserRequestResponse(
                                        req.getId(),
                                        req.getType(),
                                        aptCode,
                                        req.getDescription(),
                                        req.getStatus(),
                                        req.getCreatedAt());
                });
        }

        @Transactional
        public UserRequestResponse updateRequestStatus(Long requestId, RequestStatus newStatus) {
                UserRequest request = userRequestRepository.findById(requestId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu: " + requestId));

                request.setStatus(newStatus);
                UserRequest savedRequest = userRequestRepository.save(request);

                String aptCode = (savedRequest.getHousehold() != null
                                && savedRequest.getHousehold().getApartment() != null)
                                                ? savedRequest.getHousehold().getApartment().getCode()
                                                : null;

                return new UserRequestResponse(
                                savedRequest.getId(),
                                savedRequest.getType(),
                                aptCode,
                                savedRequest.getDescription(),
                                savedRequest.getStatus(),
                                savedRequest.getCreatedAt());
        }
}