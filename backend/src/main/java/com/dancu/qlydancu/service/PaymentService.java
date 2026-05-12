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

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private BillDetailRepository billDetailRepository;
    @Autowired private BillRepository billRepository;

    @Transactional
    public Payment submitPaymentVerification(PaymentRequestDTO request) {
        List<BillDetail> details = billDetailRepository.findAllById(request.getBillDetailIds());
        
        if (details.isEmpty() || details.size() != request.getBillDetailIds().size()) {
            throw new RuntimeException("Một hoặc nhiều khoản phí không tồn tại");
        }

        long totalAmount = 0L;
        Payment payment = new Payment();
        
        for (BillDetail bd : details) {
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

    @Transactional
    public Payment approvePayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Giao dịch này đã được xử lý trước đó");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(LocalDateTime.now());

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

    @Transactional
    public Payment rejectPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

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

        if (allPaid) {
            bill.setStatus(BillDetailStatus.PAID);
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