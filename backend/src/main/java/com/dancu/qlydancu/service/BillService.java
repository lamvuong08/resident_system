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
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.repo.BillDetailRepository;
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
                d.getDueDate()
        )).collect(Collectors.toList());
    }
}