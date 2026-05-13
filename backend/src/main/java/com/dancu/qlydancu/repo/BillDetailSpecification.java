package com.dancu.qlydancu.repo;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.dancu.qlydancu.dto.BillDetailFilterRequest;
import com.dancu.qlydancu.model.BillDetail;

import jakarta.persistence.criteria.Predicate;

public class BillDetailSpecification {

    public static Specification<BillDetail> filterByCriteria(BillDetailFilterRequest filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Lọc theo Mã Căn hộ (Tìm kiếm tương đối, không phân biệt hoa thường)
            if (filter.getApartmentCode() != null && !filter.getApartmentCode().trim().isEmpty()) {
                // Tạo chuỗi tìm kiếm dạng "%a1-0101%"
                String searchPattern = "%" + filter.getApartmentCode().trim().toLowerCase() + "%";
                
                // Mệnh đề: WHERE LOWER(bill.apartment.code) LIKE '%a1-0101%'
                predicates.add(cb.like(
                    cb.lower(root.get("bill").get("apartment").get("code")), 
                    searchPattern
                ));
            }

            // 2. Lọc theo Trạng thái
            if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }

            // 3. Lọc theo Tháng / Năm (Xử lý chuỗi YYYY-MM)
            if (filter.getYear() != null || filter.getMonth() != null) {
                String yearPart = filter.getYear() != null ? String.valueOf(filter.getYear()) : "%";
                String monthPart = filter.getMonth() != null ? String.format("%02d", filter.getMonth()) : "%";

                // Mệnh đề: WHERE bill.billing_month LIKE '2026-%' hoặc '%-05' hoặc '2026-05'
                predicates.add(cb.like(root.get("bill").get("billingMonth"), yearPart + "-" + monthPart));
            }

            // Kết hợp tất cả điều kiện bằng toán tử AND
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}