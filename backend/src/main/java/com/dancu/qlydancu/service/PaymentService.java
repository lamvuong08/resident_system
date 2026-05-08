package com.dancu.qlydancu.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.dancu.qlydancu.dto.PaymentRequestDTO;
import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.model.enums.BillStatus;
import com.dancu.qlydancu.model.enums.PaymentStatus;
import com.dancu.qlydancu.repo.BillRepository;
import com.dancu.qlydancu.repo.PaymentRepository;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private BillRepository billRepository;

    @Transactional
    public Payment submitPaymentVerification(PaymentRequestDTO request) {
        Bill bill = billRepository.findById(request.getBillId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));

        if (bill.getStatus() == BillStatus.PAID) {
            throw new RuntimeException("Hóa đơn đã được thanh toán!");
        }

        // Cập nhật trạng thái hóa đơn sang PENDING khi gửi yêu cầu
        bill.setStatus(BillStatus.PENDING);
        billRepository.save(bill);

        Payment payment = new Payment();
        payment.setBill(bill);
        payment.setAmount(request.getAmount());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setTransactionCode(request.getTransactionCode());
        payment.setStatus(PaymentStatus.PENDING);

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

        Bill bill = payment.getBill();
        bill.setStatus(BillStatus.PAID);
        
        billRepository.save(bill);
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment rejectPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        payment.setStatus(PaymentStatus.FAILED);

        Bill bill = payment.getBill();
        bill.setStatus(BillStatus.UNPAID); // Trả về UNPAID để thanh toán lại

        billRepository.save(bill);
        return paymentRepository.save(payment);
    }

    public List<Payment> getPendingPayments() {
        return paymentRepository.findByStatus(PaymentStatus.PENDING);
    }
}