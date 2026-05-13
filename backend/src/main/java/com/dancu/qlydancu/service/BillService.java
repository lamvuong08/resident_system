package com.dancu.qlydancu.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.dancu.qlydancu.dto.AdminBillDetailResponse;
import com.dancu.qlydancu.dto.BillDetailFilterRequest;
import com.dancu.qlydancu.dto.BillDetailRowResponse;
import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.repo.BillDetailRepository;
import com.dancu.qlydancu.repo.BillDetailSpecification;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.UserRepository;

@Service
public class BillService {
    @Autowired
    private BillDetailRepository billDetailRepository;
    @Autowired
    private HouseholdRepository householdRepository;
    @Autowired
    private UserRepository userRepository;

    public List<BillDetailRowResponse> getBillDetailsForCurrentUser(List<BillDetailStatus> statuses) {
        String identity = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameOrEmail(identity, identity)
                .orElseThrow(() -> new RuntimeException("User not found: " + identity));

        Household household = householdRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new RuntimeException("Tài khoản chưa gắn với hộ gia đình"));

        Long apartmentId = household.getApartment().getId();

        List<BillDetail> details;
        if (statuses != null && !statuses.isEmpty()) {
            details = billDetailRepository.findByBill_Apartment_IdAndBill_StatusIn(apartmentId, statuses);
        } else {
            details = billDetailRepository.findByBill_Apartment_Id(apartmentId);
        }

        // CẬP NHẬT PHẦN MAP DƯỚI ĐÂY
        return details.stream().map(d -> new BillDetailRowResponse(
                d.getId(),
                d.getBill().getBillingMonth(),
                d.getFeeType().getName(),
                d.getAmount(),
                d.getStatus(),
                d.getBill().getId(),
                d.getBill().getCreatedAt(),
                d.getDueDate())).collect(Collectors.toList());
    }

    public Page<AdminBillDetailResponse> getAdminBillDetails(BillDetailFilterRequest filter, Pageable pageable) {
        // 1. Gắn bộ lọc động
        Specification<BillDetail> spec = BillDetailSpecification.filterByCriteria(filter);

        // 2. Query Database có phân trang
        Page<BillDetail> page = billDetailRepository.findAll(spec, pageable);

        // 3. Map sang DTO trả về cho Admin
        return page.map(d -> new AdminBillDetailResponse(
                d.getId(),
                d.getBill().getApartment().getCode(),
                d.getBill().getBillingMonth(),
                d.getFeeType().getName(),
                d.getAmount(),
                d.getStatus(),
                d.getBill().getId(),
                d.getBill().getCreatedAt(),
                d.getDueDate()));
    }

    @Transactional
    public void updateBillDetailStatus(Long detailId, BillDetailStatus newStatus) {
        BillDetail detail = billDetailRepository.findById(detailId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết hóa đơn ID: " + detailId));

        detail.setStatus(newStatus);
        billDetailRepository.save(detail);

        // Lưu ý: Bạn có thể thêm logic cập nhật trạng thái của Hóa đơn tổng (Bill) tại
        // đây
        // nếu tất cả các BillDetail đều đã chuyển sang PAID.
    }
}