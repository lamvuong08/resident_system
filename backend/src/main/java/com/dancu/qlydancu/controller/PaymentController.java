package com.dancu.qlydancu.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.PaymentRequestDTO;
import com.dancu.qlydancu.dto.PaymentResponseDTO;
import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.service.PaymentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*") 
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping("/submit")
    public ResponseEntity<?> submitPayment(@Valid @RequestBody PaymentRequestDTO request) {
        try {
            Payment payment = paymentService.submitPaymentVerification(request);
            return ResponseEntity.ok(PaymentResponseDTO.fromEntity(payment));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<List<PaymentResponseDTO>> getPendingPayments() {
        List<Payment> pendingList = paymentService.getPendingPayments();
        List<PaymentResponseDTO> response = pendingList.stream()
                .map(PaymentResponseDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approvePayment(@PathVariable Long id) {
        try {
            Payment approvedPayment = paymentService.approvePayment(id);
            return ResponseEntity.ok(PaymentResponseDTO.fromEntity(approvedPayment));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectPayment(@PathVariable Long id) {
        try {
            Payment rejectedPayment = paymentService.rejectPayment(id);
            return ResponseEntity.ok(PaymentResponseDTO.fromEntity(rejectedPayment));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}