package com.dancu.qlydancu.repo;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.dancu.qlydancu.model.Bill;

import jakarta.persistence.criteria.Predicate;

public class BillSpecification {

    public static Specification<Bill> filterByCriteria(String apartmentCode, String status, Integer month, Integer year) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (apartmentCode != null && !apartmentCode.trim().isEmpty()) {
                String searchPattern = "%" + apartmentCode.trim().toLowerCase() + "%";
                predicates.add(cb.like(
                    cb.lower(root.get("apartment").get("code")), 
                    searchPattern
                ));
            }
            if (status != null && !status.isEmpty()) {
                if (status.equals("PAID")) {
                    predicates.add(cb.equal(root.get("status"), com.dancu.qlydancu.model.enums.BillDetailStatus.PAID));
                } else if (status.equals("UNPAID")) {
                    predicates.add(cb.equal(root.get("status"), com.dancu.qlydancu.model.enums.BillDetailStatus.UNPAID));
                }
            }

            if (year != null || month != null) {
                String yearPart = year != null ? String.valueOf(year) : "%";
                String monthPart = month != null ? String.format("%02d", month) : "%";
                predicates.add(cb.like(root.get("billingMonth"), monthPart + "/" + yearPart));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
