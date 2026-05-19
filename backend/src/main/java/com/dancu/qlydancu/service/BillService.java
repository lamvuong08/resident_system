package com.dancu.qlydancu.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.dancu.qlydancu.dto.AdminAggregatedBillResponse;
import com.dancu.qlydancu.dto.AdminBillDetailInfo;
import com.dancu.qlydancu.dto.AdminBillFullResponse;
import com.dancu.qlydancu.repo.BillSpecification;
import com.dancu.qlydancu.model.Payment;
import com.dancu.qlydancu.repo.PaymentRepository;

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
import com.dancu.qlydancu.repo.ResidentRepository;
import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.model.Resident;

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
    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private ResidentRepository residentRepository;

    private String calculateBillStatus(Bill bill, List<BillDetail> details) {
        if (bill.getStatus() == BillDetailStatus.PAID) {
            return "Đã thanh toán";
        }
        
        boolean isOverdue = false;
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        for (BillDetail detail : details) {
            if (detail.getStatus() != BillDetailStatus.PAID && detail.getDueDate() != null && detail.getDueDate().isBefore(now)) {
                isOverdue = true;
                break;
            }
        }
        
        if (isOverdue) return "Quá hạn";
        return "Chưa thanh toán";
    }

    public Page<AdminAggregatedBillResponse> getAdminAggregatedBills(String apartmentCode, String status, Integer month, Integer year, Pageable pageable) {
        Specification<Bill> spec = BillSpecification.filterByCriteria(apartmentCode, status, month, year);
        Page<Bill> page = billRepository.findAll(spec, pageable);

        return page.map(bill -> {
            List<BillDetail> details = billDetailRepository.findByBill_Id(bill.getId());
            
            Household h = householdRepository.findByApartment_Code(bill.getApartment().getCode()).orElse(null);
            String ownerName = (h != null && h.getUser() != null) ? h.getUser().getName() : "";

            java.time.LocalDateTime firstDueDate = null;
            if (!details.isEmpty()) {
                firstDueDate = details.get(0).getDueDate();
            }

            return new AdminAggregatedBillResponse(
                bill.getId(),
                bill.getApartment().getCode(),
                ownerName,
                bill.getBillingMonth(),
                bill.getTotalAmount(),
                firstDueDate,
                calculateBillStatus(bill, details)
            );
        });
    }

    public AdminBillFullResponse getAdminBillDetailFull(Long id) {
        Bill bill = billRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn tổng hợp"));
        List<BillDetail> details = billDetailRepository.findByBill_Id(bill.getId());
        
        Household h = householdRepository.findByApartment_Code(bill.getApartment().getCode()).orElse(null);
        String ownerName = (h != null && h.getUser() != null) ? h.getUser().getName() : "";
        String ownerPhone = (h != null && h.getUser() != null) ? h.getUser().getUsername() : "";

        java.time.LocalDateTime firstDueDate = null;
        if (!details.isEmpty()) {
            firstDueDate = details.get(0).getDueDate();
        }

        List<AdminBillDetailInfo> feeDetails = details.stream()
            .map(d -> new AdminBillDetailInfo(
                d.getId(), 
                d.getFeeType().getName(), 
                d.getAmount(), 
                d.getNote(),
                d.getOldReading(),
                d.getNewReading(),
                d.getUnitPrice(),
                d.getQuantity()
            ))
            .collect(Collectors.toList());

        LocalDateTime paidAt = null;
        String paymentMethod = null;
        String transactionCode = null;
        String confirmedBy = null; // No entity stores this yet, maybe admin username

        if (bill.getStatus() == BillDetailStatus.PAID) {
            Payment p = paymentRepository.findLatestSuccessfulPaymentByBillId(bill.getId());
            if (p != null) {
                paidAt = p.getPaidAt();
                paymentMethod = p.getPaymentMethod() != null ? p.getPaymentMethod().name() : null;
                transactionCode = p.getTransactionCode();
            }
        }

        return new AdminBillFullResponse(
            bill.getId(),
            bill.getApartment().getCode(),
            ownerName,
            ownerPhone,
            bill.getBillingMonth(),
            bill.getCreatedAt(),
            firstDueDate,
            bill.getTotalAmount(),
            calculateBillStatus(bill, details),
            feeDetails,
            paidAt,
            paymentMethod,
            transactionCode,
            confirmedBy
        );
    }

    @Transactional
    public Bill getOrCreateBill(Apartment apartment, String billingMonth) {
        Bill bill = billRepository.findByApartmentIdAndBillingMonth(apartment.getId(), billingMonth)
            .orElseGet(() -> {
                Bill newBill = new Bill();
                newBill.setApartment(apartment);
                newBill.setBillingMonth(billingMonth);
                newBill.setTotalAmount(0L);
                newBill.setStatus(BillDetailStatus.UNPAID);
                newBill.setCreatedAt(java.time.LocalDateTime.now());
                return billRepository.save(newBill);
            });
        
        return bill;
    }

    private void addFixedFees(Bill bill) {
        // Lấy tất cả loại phí FIXED
        List<FeeType> fixedFees = feeTypeRepository.findAllByCalculationType(com.dancu.qlydancu.model.enums.CalculationType.FIXED);
        
        for (FeeType ft : fixedFees) {
            // Kiểm tra xem đã có khoản phí này trong hóa đơn chưa
            boolean exists = billDetailRepository.findByBillIdAndFeeTypeId(bill.getId(), ft.getId()).isPresent();
            if (!exists) {
                BillDetail detail = new BillDetail();
                detail.setBill(bill);
                detail.setFeeType(ft);
                detail.setAmount(ft.getDefaultAmount() != null ? ft.getDefaultAmount() : 0L);
                detail.setUnitPrice(ft.getDefaultAmount() != null ? ft.getDefaultAmount() : 0L);
                detail.setQuantity(java.math.BigDecimal.ONE);
                detail.setStatus(BillDetailStatus.UNPAID);
                detail.setDueDate(java.time.LocalDateTime.now().plusDays(15));
                detail.setNote("Phí cố định hàng tháng");
                billDetailRepository.save(detail);

                // Cập nhật tổng tiền hóa đơn
                long currentTotal = (bill.getTotalAmount() != null) ? bill.getTotalAmount() : 0L;
                bill.setTotalAmount(currentTotal + detail.getAmount());
            }
        }
    }

    @Transactional
    public void createElectricityFee(com.dancu.qlydancu.dto.FixedFeeRequest request) {
        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy căn hộ"));

        Household household = householdRepository.findByApartment_Code(apartment.getCode()).orElse(null);
        if (household == null) {
            throw new RuntimeException("Phòng này đang trống, không thể tạo khoản phí.");
        }

        List<Resident> residents = residentRepository.findByHouseholdId(household.getId());
        if (residents == null || residents.isEmpty()) {
            throw new RuntimeException("Phòng này đang trống (chưa có cư dân ở), không thể tạo khoản phí.");
        }

        FeeType feeType = feeTypeRepository.findById(request.getFeeTypeId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy loại phí"));

        if (feeType.getCalculationType() != com.dancu.qlydancu.model.enums.CalculationType.ELECTRIC_METER) {
            throw new RuntimeException("Khoản phí này không phải tiền điện.");
        }

        // Chống tạo trùng: Cùng căn hộ, Cùng tháng, Cùng loại phí
        Bill bill = getOrCreateBill(apartment, request.getBillingMonth());
        
        boolean alreadyExists = billDetailRepository.findByBillIdAndFeeTypeId(bill.getId(), feeType.getId()).isPresent();
        if (alreadyExists) {
            throw new RuntimeException("Khoản phí này đã tồn tại trong tháng đã chọn.");
        }

        BillDetail detail = new BillDetail();
        detail.setBill(bill);
        detail.setFeeType(feeType);
        detail.setStatus(BillDetailStatus.UNPAID);
        detail.setNote(request.getNote());

        if (request.getDueDate() != null && !request.getDueDate().isEmpty()) {
            try {
                if (request.getDueDate().contains("T")) {
                   detail.setDueDate(java.time.LocalDateTime.parse(request.getDueDate()));
                } else {
                   // Giả sử có format yyyy-MM-dd
                   detail.setDueDate(java.time.LocalDate.parse(request.getDueDate()).atTime(23, 59));
                }
            } catch (Exception e) {
                detail.setDueDate(java.time.LocalDateTime.now().plusDays(15));
            }
        } else {
            detail.setDueDate(java.time.LocalDateTime.now().plusDays(15));
        }

        long finalAmount = 0L;
        if (feeType.getCalculationType() == com.dancu.qlydancu.model.enums.CalculationType.FIXED) {
            // Lấy từ cấu hình backend, không tin frontend
            finalAmount = feeType.getDefaultAmount() != null ? feeType.getDefaultAmount() : 0L;
            detail.setQuantity(java.math.BigDecimal.ONE);
            detail.setUnitPrice(finalAmount);
        } else if (feeType.getCalculationType() == com.dancu.qlydancu.model.enums.CalculationType.ELECTRIC_METER) {
            if (request.getOldReading() == null || request.getNewReading() == null) {
                throw new RuntimeException("Tiền điện yêu cầu nhập chỉ số cũ và mới");
            }
            if (request.getNewReading().compareTo(request.getOldReading()) < 0) {
                throw new RuntimeException("Chỉ số mới không được nhỏ hơn chỉ số cũ");
            }
            
            detail.setOldReading(request.getOldReading());
            detail.setNewReading(request.getNewReading());
            
            java.math.BigDecimal usage = request.getNewReading().subtract(request.getOldReading());
            detail.setQuantity(usage);
            
            // Đơn giá: Ưu tiên đơn giá từ cấu hình feeType, hoặc fallback 2167
            long unitPrice = feeType.getUnitPrice() != null ? feeType.getUnitPrice() : 2167L;
            detail.setUnitPrice(unitPrice);
            
            finalAmount = usage.multiply(java.math.BigDecimal.valueOf(unitPrice)).longValue();
        } else {
            // Các loại phí khác nếu có
            finalAmount = request.getAmount() != null ? request.getAmount() : 0L;
            detail.setQuantity(java.math.BigDecimal.ONE);
            detail.setUnitPrice(finalAmount);
        }

        detail.setAmount(finalAmount);
        billDetailRepository.save(detail);

        // Cập nhật tổng tiền hóa đơn cha
        long currentTotal = (bill.getTotalAmount() != null) ? bill.getTotalAmount() : 0L;
        bill.setTotalAmount(currentTotal + finalAmount);
        billRepository.save(bill);
    }

    @Transactional
    public void createFixedFeeBill(com.dancu.qlydancu.dto.FixedFeeRequest request) {
        createElectricityFee(request);
    }

    @Transactional
    public void createBulkBills(com.dancu.qlydancu.dto.BulkBillRequest request) {
        for (Long apartmentId : request.apartmentIds()) {
            com.dancu.qlydancu.dto.FixedFeeRequest singleRequest = new com.dancu.qlydancu.dto.FixedFeeRequest();
            singleRequest.setApartmentId(apartmentId);
            singleRequest.setFeeTypeId(request.feeTypeId());
            singleRequest.setBillingMonth(request.billingMonth());
            singleRequest.setAmount(request.amount());
            singleRequest.setDueDate(request.dueDate());
            createFixedFeeBill(singleRequest);
        }
    }

    @Transactional
    public void initializeAllBillsForMonth(String billingMonth) {
        List<Apartment> apartments = apartmentRepository.findAll();
        for (Apartment apt : apartments) {
            Household household = householdRepository.findByApartment_Code(apt.getCode()).orElse(null);
            if (household != null) {
                List<Resident> residents = residentRepository.findByHouseholdId(household.getId());
                if (residents != null && !residents.isEmpty()) {
                    Bill bill = getOrCreateBill(apt, billingMonth);
                    addFixedFees(bill);
                }
            }
        }
    }

    @Transactional
    public void confirmBillPayment(Long billId, com.dancu.qlydancu.dto.BillConfirmRequest request) {
        Bill bill = billRepository.findById(billId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));

        if (bill.getStatus() == BillDetailStatus.PAID) {
            throw new RuntimeException("Hóa đơn đã thanh toán trước đó");
        }

        List<BillDetail> details = billDetailRepository.findByBill_Id(billId);
        
        // Tạo Payment record
        Payment payment = new Payment();
        payment.setAmount(bill.getTotalAmount());
        payment.setStatus(com.dancu.qlydancu.model.enums.PaymentStatus.SUCCESS);
        payment.setPaidAt(request.paymentDate() != null ? request.paymentDate() : LocalDateTime.now());
        payment.setPaymentMethod(com.dancu.qlydancu.model.enums.PaymentMethod.valueOf(request.paymentMethod() != null ? request.paymentMethod() : "CASH"));
        payment.setTransactionCode(request.transactionCode());
        payment.setNote(request.note());
        
        // Phải lưu payment trước để có ID nếu PaymentDetail dùng id compound
        payment = paymentRepository.save(payment);

        for (BillDetail bd : details) {
            bd.setStatus(BillDetailStatus.PAID);
            payment.addPaymentDetail(bd);
        }

        bill.setStatus(BillDetailStatus.PAID);
        billRepository.save(bill);
        billDetailRepository.saveAll(details);
        paymentRepository.save(payment);
    }

    public com.dancu.qlydancu.dto.BillStatisticsResponse getStatistics() {
        List<Bill> allBills = billRepository.findAll();
        long totalCollected = allBills.stream()
            .filter(b -> b.getStatus() == BillDetailStatus.PAID)
            .mapToLong(b -> b.getTotalAmount() != null ? b.getTotalAmount() : 0L)
            .sum();

        long totalUnpaid = allBills.stream()
            .filter(b -> b.getStatus() != BillDetailStatus.PAID)
            .mapToLong(b -> b.getTotalAmount() != null ? b.getTotalAmount() : 0L)
            .sum();

        LocalDateTime now = LocalDateTime.now();
        long overdueCount = 0;
        long unpaidCount = 0;

        for (Bill b : allBills) {
            if (b.getStatus() != BillDetailStatus.PAID) {
                unpaidCount++;
                List<BillDetail> details = billDetailRepository.findByBill_Id(b.getId());
                boolean isOverdue = details.stream().anyMatch(d -> d.getDueDate() != null && d.getDueDate().isBefore(now));
                if (isOverdue) overdueCount++;
            }
        }

        return new com.dancu.qlydancu.dto.BillStatisticsResponse(totalCollected, totalUnpaid, overdueCount, unpaidCount);
    }

    @Transactional
    public void updateBill(Long id, com.dancu.qlydancu.dto.FixedFeeRequest request) {
        // This was a placeholder, we can keep it for single-item updates if needed
        // but it's better to use updateBillDetail for specific line items.
        throw new RuntimeException("Vui lòng sử dụng updateBillDetail");
    }

    @Transactional
    public void updateBillDetail(com.dancu.qlydancu.dto.BillDetailUpdateRequest request) {
        if (request.getId() == null) {
            throw new RuntimeException("ID khoản phí không được để trống");
        }
        BillDetail detail = billDetailRepository.findById(request.getId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản phí với ID: " + request.getId()));
        
        Bill bill = detail.getBill();
        if (bill == null) {
            throw new RuntimeException("Khoản phí không thuộc hóa đơn nào (Dữ liệu lỗi)");
        }
        // Kiểm tra xem hóa đơn tổng đã thanh toán chưa
        if (bill.getStatus() == BillDetailStatus.PAID) {
            throw new RuntimeException("Hóa đơn đã thanh toán, không được phép sửa");
        }

        long oldAmount = detail.getAmount();

        if (request.getFeeTypeId() != null) {
            FeeType feeType = feeTypeRepository.findById(request.getFeeTypeId())
                .orElseThrow(() -> new RuntimeException("Loại phí không hợp lệ"));
            detail.setFeeType(feeType);
        }

        if (request.getAmount() != null) {
            detail.setAmount(request.getAmount());
            // Cập nhật tổng tiền hóa đơn cha
            long currentTotal = (bill.getTotalAmount() != null) ? bill.getTotalAmount() : 0L;
            bill.setTotalAmount(currentTotal - oldAmount + request.getAmount());
        }

        if (request.getDueDate() != null) {
            detail.setDueDate(request.getDueDate());
        }

        if (request.getNote() != null) {
            detail.setNote(request.getNote());
        }

        // Nếu thay đổi tháng/năm, phải chuyển sang Bill (hóa đơn tổng) khác
        if (request.getBillingMonth() != null && !request.getBillingMonth().equals(bill.getBillingMonth())) {
            Bill targetBill = billRepository.findByApartmentIdAndBillingMonth(bill.getApartment().getId(), request.getBillingMonth())
                .orElseGet(() -> {
                    Bill nb = new Bill();
                    nb.setApartment(bill.getApartment());
                    nb.setBillingMonth(request.getBillingMonth());
                    nb.setStatus(BillDetailStatus.UNPAID);
                    nb.setTotalAmount(0L);
                    nb.setCreatedAt(LocalDateTime.now());
                    return billRepository.save(nb);
                });
            
            if (targetBill.getStatus() == BillDetailStatus.PAID) {
                throw new RuntimeException("Không thể chuyển khoản phí vào tháng đã thanh toán");
            }

            // Di chuyển detail
            detail.setBill(targetBill);
            targetBill.setTotalAmount((targetBill.getTotalAmount() != null ? targetBill.getTotalAmount() : 0L) + detail.getAmount());
            bill.setTotalAmount((bill.getTotalAmount() != null ? bill.getTotalAmount() : 0L) - detail.getAmount());
            billRepository.save(targetBill);
        }

        billDetailRepository.save(detail);

        // Nếu hóa đơn cũ không còn khoản phí nào, có thể xóa hoặc giữ lại với total = 0
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
                d.getDueDate(),
                d.getOldReading(),
                d.getNewReading(),
                d.getUnitPrice())).collect(Collectors.toList());
    }

    public List<AdminAggregatedBillResponse> getAggregatedBillsForCurrentUser() {
        String identity = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameOrEmail(identity, identity)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Household household = householdRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new RuntimeException("Tài khoản chưa gắn với hộ gia đình"));

        List<Bill> bills = billRepository.findByApartment_Id(household.getApartment().getId());
        
        return bills.stream().map(bill -> {
            List<BillDetail> details = billDetailRepository.findByBill_Id(bill.getId());
            java.time.LocalDateTime firstDueDate = details.isEmpty() ? null : details.get(0).getDueDate();

            return new AdminAggregatedBillResponse(
                bill.getId(),
                bill.getApartment().getCode(),
                user.getName(),
                bill.getBillingMonth(),
                bill.getTotalAmount(),
                firstDueDate,
                calculateBillStatus(bill, details)
            );
        }).collect(Collectors.toList());
    }

    public AdminBillFullResponse getUserBillFull(Long billId) {
        String identity = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameOrEmail(identity, identity)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Household household = householdRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new RuntimeException("Tài khoản chưa gắn với hộ gia đình"));

        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));

        // Kiểm tra quyền: Hóa đơn phải thuộc về căn hộ của user
        if (!bill.getApartment().getId().equals(household.getApartment().getId())) {
            throw new RuntimeException("Bạn không có quyền xem hóa đơn này");
        }

        return getAdminBillDetailFull(billId);
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