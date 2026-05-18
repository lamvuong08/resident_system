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
import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.FeeType;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.BillDetailRepository;
import com.dancu.qlydancu.repo.BillDetailSpecification;
import com.dancu.qlydancu.repo.BillRepository;
import com.dancu.qlydancu.repo.FeeTypeRepository;
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
    @Autowired
    private BillRepository billRepository;
    @Autowired
    private ApartmentRepository apartmentRepository;
    @Autowired
    private FeeTypeRepository feeTypeRepository;


    @Transactional
    public void createFixedFeeBill(com.dancu.qlydancu.dto.FixedFeeRequest request) {
        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy căn hộ"));

        FeeType feeType = feeTypeRepository.findById(request.getFeeTypeId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy loại phí"));

        // Tìm hoặc tạo Bill tổng
        Bill bill = billRepository.findByApartmentIdAndBillingMonth(apartment.getId(), request.getBillingMonth())
            .orElseGet(() -> {
                Bill newBill = new Bill();
                newBill.setApartment(apartment);
                newBill.setBillingMonth(request.getBillingMonth());
                newBill.setTotalAmount(0L);
                newBill.setStatus(BillDetailStatus.UNPAID);
                newBill.setCreatedAt(java.time.LocalDateTime.now());
                return billRepository.save(newBill);
            });

        // Tìm hoặc tạo BillDetail
        BillDetail detail = billDetailRepository.findByBillIdAndFeeTypeId(bill.getId(), feeType.getId())
            .orElseGet(() -> {
                BillDetail newDetail = new BillDetail();
                newDetail.setBill(bill);
                newDetail.setFeeType(feeType);
                newDetail.setStatus(BillDetailStatus.UNPAID);
                newDetail.setDueDate(java.time.LocalDateTime.now().plusDays(15));
                return newDetail;
            });

        long oldAmount = (detail.getAmount() != null) ? detail.getAmount() : 0L;
        detail.setQuantity(java.math.BigDecimal.ONE);
        detail.setAmount(request.getAmount());
        detail.setUnitPrice(request.getAmount());
        billDetailRepository.save(detail);

        // Cập nhật tổng tiền
        long currentTotal = (bill.getTotalAmount() != null) ? bill.getTotalAmount() : 0L;
        bill.setTotalAmount(currentTotal - oldAmount + request.getAmount());
        billRepository.save(bill);
    }

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