package com.dancu.qlydancu.service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.dancu.qlydancu.dto.PaymentRequestDTO;
import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.model.PaymentDetail;
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.model.enums.PaymentStatus;
import com.dancu.qlydancu.repo.BillDetailRepository;
import com.dancu.qlydancu.repo.BillRepository;
import com.dancu.qlydancu.repo.PaymentRepository;

@Service
public class PaymentService {
    @Autowired private com.dancu.qlydancu.billing.BillEmailEventPublisher billEmailEvents;

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private BillDetailRepository billDetailRepository;
    @Autowired private BillRepository billRepository;
    @Autowired private com.dancu.qlydancu.repo.UserRepository users;
    @Autowired private com.dancu.qlydancu.repo.HouseholdRepository households;

    @Transactional
    public Payment submitPaymentVerification(PaymentRequestDTO request) {
        var authentication=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null)throw new org.springframework.security.access.AccessDeniedException("Cần đăng nhập cư dân");
        var user=users.findByUsernameOrEmail(authentication.getName(),authentication.getName()).orElseThrow(()->new org.springframework.security.access.AccessDeniedException("Không tìm thấy cư dân"));
        var household=households.findByUser_Id(user.getId()).orElseThrow(()->new org.springframework.security.access.AccessDeniedException("Chưa gắn hộ gia đình"));
        if(user.getRoles()!=com.dancu.qlydancu.model.enums.UserRole.ROLE_USER)throw new org.springframework.security.access.AccessDeniedException("Chỉ cư dân được gửi giao dịch");
        if(request.getBillDetailIds()==null||request.getBillDetailIds().isEmpty()||new java.util.HashSet<>(request.getBillDetailIds()).size()!=request.getBillDetailIds().size())
            throw new IllegalArgumentException("Danh sách khoản phí không hợp lệ hoặc bị trùng");
        List<BillDetail> details = billDetailRepository.findAllById(request.getBillDetailIds());
        
        if (details.isEmpty() || details.size() != request.getBillDetailIds().size()) {
            throw new RuntimeException("Một hoặc nhiều khoản phí không tồn tại");
        }

        long totalAmount = 0L;
        Payment payment = new Payment();
        
        for (BillDetail bd : details) {
            if(!bd.getBill().getApartment().getId().equals(household.getApartment().getId()))
                throw new org.springframework.security.access.AccessDeniedException("Không được thanh toán khoản phí căn hộ khác");
            if(bd.getBill().getIssuedAt()==null)throw new IllegalArgumentException("Không thanh toán hóa đơn chưa phát hành");
            if (bd.getStatus() != BillDetailStatus.UNPAID) {
                throw new RuntimeException("Khoản phí ID " + bd.getId() + " đã thanh toán hoặc đang chờ duyệt!");
            }
            // Cộng dồn tiền và cập nhật trạng thái
            totalAmount += bd.getAmount();
            bd.setStatus(BillDetailStatus.PENDING);
            
            // Map Entity trung gian
            payment.addPaymentDetail(bd);
        }

        payment.setAmount(totalAmount);
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setTransactionCode(request.getTransactionCode());
        payment.setStatus(PaymentStatus.PENDING);

        billDetailRepository.saveAll(details);
        return paymentRepository.save(payment);
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Payment approvePayment(Long paymentId) {
        Payment payment = paymentRepository.findLockedById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Giao dịch này đã được xử lý trước đó");
        }

        // Lock parent bills in a stable order before mutating any fee; other confirmations use the same lock.
        paymentRepository.findBillIdsForPayment(paymentId).stream()
            .forEach(id -> {
                Bill locked = billRepository.findLockedById(id).orElseThrow();
                if (locked.getStatus() == BillDetailStatus.PAID) throw new IllegalStateException("Hóa đơn đã được thanh toán đầy đủ");
            });
        if (payment.getPaymentDetails().isEmpty() || payment.getPaymentDetails().stream().anyMatch(pd -> pd.getBillDetail().getStatus() == BillDetailStatus.PAID))
            throw new IllegalStateException("Giao dịch không có khoản phí hợp lệ hoặc khoản phí đã được thanh toán");
        long currentAmount = payment.getPaymentDetails().stream().mapToLong(pd -> pd.getBillDetail().getAmount()).sum();
        if (payment.getAmount() == null || payment.getAmount() != currentAmount)
            throw new IllegalStateException("Số tiền hóa đơn đã thay đổi; cần đối soát lại giao dịch trước khi xác nhận");
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(billEmailEvents.now());

        Set<Bill> parentBillsToUpdate = new HashSet<>();

        for (PaymentDetail pd : payment.getPaymentDetails()) {
            BillDetail bd = pd.getBillDetail();
            bd.setStatus(BillDetailStatus.PAID);
            parentBillsToUpdate.add(bd.getBill());
        }

        // Kích hoạt cập nhật trạng thái Hóa đơn tổng
        parentBillsToUpdate.forEach(this::syncParentBillStatus);

        return paymentRepository.save(payment);
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Payment rejectPayment(Long paymentId) {
        Payment payment = paymentRepository.findLockedById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        if (payment.getStatus() != PaymentStatus.PENDING) throw new IllegalStateException("Giao dịch đã được xử lý");
        paymentRepository.findBillIdsForPayment(paymentId).forEach(id -> billRepository.findLockedById(id).orElseThrow());
        if(payment.getPaymentDetails().stream().anyMatch(pd -> pd.getBillDetail().getStatus()==BillDetailStatus.PAID))
            throw new IllegalStateException("Không từ chối giao dịch có khoản phí đã thanh toán");
        payment.setStatus(PaymentStatus.FAILED);

        for (PaymentDetail pd : payment.getPaymentDetails()) {
            BillDetail bd = pd.getBillDetail();
            bd.setStatus(BillDetailStatus.UNPAID); // Nhả lại để đóng sau
        }

        return paymentRepository.save(payment);
    }

    private void syncParentBillStatus(Bill bill) {
        List<BillDetail> allDetails = billDetailRepository.findByBill_Id(bill.getId());
        
        // Kiểm tra xem có phải TẤT CẢ đều đã PAID không
        boolean allPaid = allDetails.stream().allMatch(d -> d.getStatus() == BillDetailStatus.PAID);

        if (allPaid && !allDetails.isEmpty()) {
            bill.setStatus(BillDetailStatus.PAID);
            billEmailEvents.paid(bill);
        } else {
            // Chỉ cần 1 khoản chưa trả hoặc đang chờ duyệt -> Bill tổng vẫn là UNPAID
            bill.setStatus(BillDetailStatus.UNPAID);
        }
        
        billRepository.save(bill);
    }

    public List<Payment> getPendingPayments() {
        return paymentRepository.findByStatus(PaymentStatus.PENDING);
    }
}
