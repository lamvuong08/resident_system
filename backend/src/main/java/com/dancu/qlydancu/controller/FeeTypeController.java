package com.dancu.qlydancu.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.model.FeeType;
import com.dancu.qlydancu.repo.FeeTypeRepository;

@RestController
@RequestMapping("/api/fee-types")
@CrossOrigin(origins = "*")
public class FeeTypeController {

    @Autowired
    private FeeTypeRepository feeTypeRepository;

    // API lấy danh sách loại phí để Frontend render Dropdown
    @GetMapping
    public ResponseEntity<List<FeeType>> getAllFeeTypes() {
        try {
            List<FeeType> feeTypes = feeTypeRepository.findAll();
            return ResponseEntity.ok(feeTypes);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}