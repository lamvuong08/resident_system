package com.dancu.qlydancu.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.dancu.qlydancu.dto.BillDetailRowResponse;
import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.repo.BillDetailRepository;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.UserRepository;

@Service
public class BillService {
    @Autowired private BillDetailRepository billDetailRepository;
    @Autowired private HouseholdRepository householdRepository;
    @Autowired private UserRepository userRepository;

    public List<BillDetailRowResponse> getBillDetailsForCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Household household = householdRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new RuntimeException("Tài khoản chưa gắn với hộ gia đình"));

        Long apartmentId = household.getApartment().getId();

        // Lấy toàn bộ chi tiết phí của căn hộ (Join qua Bill -> Apartment)
        List<BillDetail> details = billDetailRepository.findAll().stream()
                .filter(d -> d.getBill().getApartment().getId().equals(apartmentId))
                .toList();

        return details.stream().map(d -> new BillDetailRowResponse(
                d.getId(),
                d.getBill().getBillingMonth(), // Lấy tháng từ Bill cha
                d.getFeeType().getName(),      // Lấy tên phí (Điện, Nước...) từ FeeType
                d.getAmount(),
                d.getBill().getStatus(),       // Trạng thái thanh toán của Bill cha
                d.getBill().getId(),
                d.getBill().getCreatedAt()
        )).collect(Collectors.toList());
    }
}