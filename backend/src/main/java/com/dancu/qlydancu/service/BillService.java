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
@Transactional(readOnly=true)
public class BillService {
    @Autowired private MeteringPolicy meteringPolicy;
    @Autowired private com.dancu.qlydancu.repo.MeterReadingRepository meterReadings;
    @Autowired private com.dancu.qlydancu.repo.MeterReadingAuditRepository meterAudits;
    @Autowired private com.dancu.qlydancu.repo.VehicleRepository vehicles;
    @Autowired private MeterPricingService pricing;
    @Autowired private com.dancu.qlydancu.billing.BillingReminderProperties emailSettings;

    public void lockApartmentBilling(Long apartmentId) {
        // Lock in the same order as the outbox worker: bills, then apartment.
        for(Long id:billRepository.findIdsForApartment(apartmentId))billRepository.findLockedById(id).orElseThrow();
        apartmentRepository.findLockedById(apartmentId).orElseThrow();
    }
    private void requireDraft(Bill bill) {
        if(!bill.isDraft())throw new IllegalStateException("Hóa đơn đã phát hành/thanh toán; cần quy trình điều chỉnh, không sửa trực tiếp");
    }
    private String actor() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated())throw new org.springframework.security.access.AccessDeniedException("Cần đăng nhập");
        return auth.getName();
    }
    private boolean parkingEligible(Bill bill) {
        var household=householdRepository.findByApartment_Code(bill.getApartment().getCode()).orElse(null);
        return household!=null && vehicles.findByHousehold_Id(household.getId()).stream()
            .anyMatch(v->v.getStatus()==com.dancu.qlydancu.model.enums.VehicleStatus.ACTIVE);
    }
    private void recalculateDraft(Bill bill) {
        requireDraft(bill);
        long total=0;
        for(var d:billDetailRepository.findByBill_Id(bill.getId())) {
            if(d.getAmount()==null||d.getAmount()<0)throw new IllegalArgumentException("Khoản phí có số tiền không hợp lệ");
            total=Math.addExact(total,d.getAmount());
        }
        bill.setTotalAmount(total);billRepository.saveAndFlush(bill);
    }

    @Transactional
    public Bill attachApprovedReading(com.dancu.qlydancu.model.MeterReading reading) {
        if(reading.getApprovalStatus()!=com.dancu.qlydancu.model.enums.MeterReadingStatus.APPROVED)
            throw new IllegalArgumentException("Chỉ đưa chỉ số đã duyệt vào hóa đơn nháp");
        var bill=getOrCreateBill(reading.getApartment(),reading.getBillingMonth());requireDraft(bill);
        var fee=feeTypeRepository.findByCode(MeterKind.of(reading.getMeterType()).feeCode)
            .orElseThrow(()->new IllegalArgumentException("Chưa cấu hình loại phí đồng hồ"));
        var existing=billDetailRepository.findByBillIdAndFeeTypeId(bill.getId(),fee.getId()).orElse(null);
        if(existing!=null) {
            if(!java.util.Objects.equals(existing.getMeterReadingId(),reading.getId()))
                throw new IllegalStateException("Đã có khoản phí cùng loại trong kỳ; cần đối soát, không cộng trùng");
            return bill;
        }
        var detail=new BillDetail();detail.setBill(bill);detail.setFeeType(fee);detail.setMeterReadingId(reading.getId());
        detail.setOldReading(reading.getOldReading());detail.setNewReading(reading.getNewReading());detail.setQuantity(reading.getUsageAmount());
        detail.setAmount(reading.getEstimatedAmount());
        detail.setUnitPrice(reading.getUsageAmount().signum()==0?0L:java.math.BigDecimal.valueOf(reading.getEstimatedAmount())
            .divide(reading.getUsageAmount(),0,java.math.RoundingMode.DOWN).longValueExact());
        detail.setStatus(BillDetailStatus.UNPAID);
        detail.setNote("Tiền "+MeterKind.of(reading.getMeterType()).label+" kỳ "+reading.getBillingMonth()+"; "+reading.getTariffSnapshot());
        billDetailRepository.saveAndFlush(detail);addFixedFees(bill);recalculateDraft(bill);return bill;
    }
    @Transactional
    public void detachRejectedReading(com.dancu.qlydancu.model.MeterReading reading) {
        billDetailRepository.findByMeterReadingId(reading.getId()).ifPresent(detail->{
            requireDraft(detail.getBill());billDetailRepository.delete(detail);billDetailRepository.flush();recalculateDraft(detail.getBill());
        });
    }
    private List<com.dancu.qlydancu.dto.MeterChargeInfo> meterInfo(List<BillDetail> lines) {
        var result=new java.util.ArrayList<com.dancu.qlydancu.dto.MeterChargeInfo>();
        for(var d:lines) {
            var reading=d.getMeterReadingId()!=null?meterReadings.findById(d.getMeterReadingId()).orElse(null)
                :meterReadings.findByIssuedBillDetailId(d.getId()).orElse(null);
            if(reading!=null)result.add(new com.dancu.qlydancu.dto.MeterChargeInfo(reading.getId(),d.getId(),d.getFeeType().getCode().name(),
                reading.getOldReading(),reading.getNewReading(),reading.getUsageAmount(),d.getAmount(),reading.getTariffSnapshot(),reading.getRecordedBy(),
                reading.getUpdatedAt()==null?reading.getCreatedAt():reading.getUpdatedAt(),reading.getApprovedBy(),reading.getApprovedAt()));
        }
        return result;
    }
    public List<String> publicationBlockers(Bill bill) {
        if(!bill.isDraft())return List.of();
        var errors=new java.util.ArrayList<String>();
        var lines=billDetailRepository.findByBill_Id(bill.getId());
        if(lines.isEmpty())errors.add("Chưa có khoản phí");
        if(bill.getTotalAmount()==null||bill.getTotalAmount()<=0)errors.add("Tổng tiền phải lớn hơn 0");
        var codes=java.util.EnumSet.noneOf(com.dancu.qlydancu.model.enums.FeeTypeCode.class);
        for(var line:lines) {
            if(!codes.add(line.getFeeType().getCode()))errors.add("Trùng loại phí "+line.getFeeType().getName());
            if(line.getAmount()==null||line.getAmount()<0)errors.add("Số tiền không hợp lệ");
            if(managedMeterFee(line.getFeeType(),bill.getBillingMonth())) {
                var r=line.getMeterReadingId()==null?null:meterReadings.findById(line.getMeterReadingId()).orElse(null);
                if(r==null||r.getApprovalStatus()!=com.dancu.qlydancu.model.enums.MeterReadingStatus.APPROVED)errors.add("Khoản điện/nước thiếu nguồn chỉ số đã duyệt");
                else try {
                    var price=pricing.prices(r.getMeterType(),r.getBillingMonth());
                    if(!r.getApartment().getId().equals(bill.getApartment().getId())
                        || !ElectricityCalculation.period(r.getBillingMonth()).equals(ElectricityCalculation.period(bill.getBillingMonth()))
                        || MeterKind.of(r.getMeterType()).feeCode!=line.getFeeType().getCode()
                        || !java.util.Objects.equals(r.getEstimatedAmount(),line.getAmount())
                        || !java.util.Objects.equals(r.getTariffSnapshot(),pricing.snapshot(r.getMeterType(),price))
                        || r.getEstimatedAmount()!=pricing.amount(r.getNewReading().subtract(r.getOldReading()),price))
                        errors.add("Nguồn/biểu giá chỉ số đã thay đổi; cần gửi duyệt lại");
                } catch(RuntimeException e) {errors.add(e.getMessage()==null?"Biểu giá không hợp lệ":e.getMessage());}
            }
        }
        if(!codes.contains(com.dancu.qlydancu.model.enums.FeeTypeCode.ELECTRIC))errors.add("Thiếu chỉ số điện đã duyệt");
        if(codes.contains(com.dancu.qlydancu.model.enums.FeeTypeCode.PARKING)&&!parkingEligible(bill))errors.add("Phí gửi xe chưa có xe đăng ký đang hoạt động; cần đối soát phí nháp");
        if(meteringPolicy.meteredWater(bill.getBillingMonth())&&!codes.contains(com.dancu.qlydancu.model.enums.FeeTypeCode.WATER))errors.add("Thiếu chỉ số nước đã duyệt");
        for(var fee:feeTypeRepository.findAllByCalculationType(com.dancu.qlydancu.model.enums.CalculationType.FIXED))
            if(!managedMeterFee(fee,bill.getBillingMonth()) && (fee.getCode()!=com.dancu.qlydancu.model.enums.FeeTypeCode.PARKING||parkingEligible(bill))
                && !codes.contains(fee.getCode()))errors.add("Thiếu khoản phí cấu hình: "+fee.getName());
        var h=householdRepository.findByApartment_Code(bill.getApartment().getCode()).orElse(null);
        if(h==null||residentRepository.findByHouseholdId(h.getId()).isEmpty())errors.add("Căn hộ chưa có hộ gia đình/cư dân hợp lệ");
        else if(h.getUser()==null||h.getUser().getStatus()!=com.dancu.qlydancu.model.enums.UserStatus.ACTIVE
            ||h.getUser().getRoles()!=com.dancu.qlydancu.model.enums.UserRole.ROLE_USER
            ||!com.dancu.qlydancu.billing.BillingReminderRepository.validEmail(h.getUser().getEmail()))errors.add("Tài khoản/email cư dân không hợp lệ");
        return List.copyOf(errors);
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public Bill issueBill(Long id,java.time.LocalDate due,Long expectedVersion) {
        Long apartmentId=billRepository.findApartmentId(id).orElseThrow(()->new IllegalArgumentException("Không tìm thấy hóa đơn"));
        lockApartmentBilling(apartmentId);var bill=billRepository.findById(id).orElseThrow();
        if(!bill.isDraft())return bill; // retry is idempotent
        if(expectedVersion!=null&&!java.util.Objects.equals(expectedVersion,bill.getVersion()))throw new IllegalStateException("Hóa đơn đã thay đổi; tải lại trước khi phát hành");
        if(due==null||due.isBefore(billEmailEvents.now().toLocalDate()))throw new IllegalArgumentException("Hạn thanh toán phải từ hôm nay trở đi");
        if(!emailSettings.isEnabled())throw new IllegalStateException("Cần bật cấu hình email hóa đơn trước khi phát hành");
        var blockers=publicationBlockers(bill);if(!blockers.isEmpty())throw new IllegalStateException(String.join("; ",blockers));
        recalculateDraft(bill);
        for(var d:billDetailRepository.findByBill_Id(id)) {
            d.setDueDate(due.atTime(23,59,59));
            if(d.getMeterReadingId()!=null) {
                var r=meterReadings.findById(d.getMeterReadingId()).orElseThrow();
                r.setApprovalStatus(com.dancu.qlydancu.model.enums.MeterReadingStatus.ISSUED);r.setIssuedAt(billEmailEvents.now());r.setIssuedBillDetailId(d.getId());meterReadings.saveAndFlush(r);
                var log=new com.dancu.qlydancu.model.MeterReadingAudit();log.setReadingId(r.getId());log.setAction("ISSUED");log.setActor(actor());
                log.setOldReading(r.getOldReading());log.setNewReading(r.getNewReading());log.setEstimatedAmount(r.getEstimatedAmount());log.setTariffSnapshot(r.getTariffSnapshot());
                log.setBillDetailId(d.getId());log.setReadingVersion(r.getVersion());log.setCreatedAt(billEmailEvents.now());meterAudits.save(log);
            }
        }
        bill.setIssuedBy(actor());billEmailEvents.issued(bill);billRepository.saveAndFlush(bill);return bill;
    }

    private boolean managedMeterFee(FeeType fee, String period) {
        return fee.getCode()==com.dancu.qlydancu.model.enums.FeeTypeCode.ELECTRIC
            || fee.getCode()==com.dancu.qlydancu.model.enums.FeeTypeCode.WATER && meteringPolicy.meteredWater(period);
    }
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
    @Autowired
    private com.dancu.qlydancu.billing.BillEmailEventPublisher billEmailEvents;

    private String calculateBillStatus(Bill bill, List<BillDetail> details) {
        if(bill.isDraft())return "Nháp";
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
                calculateBillStatus(bill, details),bill.getIssuanceStatus(),bill.getIssuedAt()
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
                d.getQuantity(),
                d.getFeeType().getCode().name(),
                d.getDueDate()
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
                confirmedBy = p.getConfirmedBy();
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
            confirmedBy,
            bill.getIssuanceStatus(),bill.getIssuedAt(),bill.getIssuedBy(),bill.getVersion(),publicationBlockers(bill),
            details.stream().filter(d->d.getStatus()==BillDetailStatus.PAID).mapToLong(BillDetail::getAmount).sum(),
            details.stream().filter(d->d.getStatus()!=BillDetailStatus.PAID).mapToLong(BillDetail::getAmount).sum(),meterInfo(details)
        );
    }

    @Transactional
    public Bill getOrCreateBill(Apartment apartment, String billingMonth) {
        lockApartmentBilling(apartment.getId());
        billingMonth=ElectricityCalculation.month(billingMonth);
        final String normalizedMonth=billingMonth;
        var matches=billRepository.findByApartment_Id(apartment.getId()).stream()
            .filter(b -> ElectricityCalculation.period(b.getBillingMonth()).equals(ElectricityCalculation.period(normalizedMonth))).toList();
        if(matches.size()>1)throw new IllegalArgumentException("Có hóa đơn kỳ cũ bị trùng; cần đối soát trước khi phát hành");
        if(!matches.isEmpty())return matches.getFirst();
        Bill bill = billRepository.findByApartmentIdAndBillingMonth(apartment.getId(), billingMonth)
            .orElseGet(() -> {
                Bill newBill = new Bill();
                newBill.setApartment(apartment);
                newBill.setBillingMonth(normalizedMonth);
                newBill.setPeriodKey(ElectricityCalculation.period(normalizedMonth).toString());
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
            if(managedMeterFee(ft,bill.getBillingMonth()))continue;
            if(ft.getCode()==com.dancu.qlydancu.model.enums.FeeTypeCode.PARKING&&!parkingEligible(bill))continue;
            if(ft.getDefaultAmount()==null||ft.getDefaultAmount()<0)throw new IllegalArgumentException("Phí cố định chưa có số tiền hợp lệ");
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
        if(managedMeterFee(feeType,request.getBillingMonth()))
            throw new IllegalArgumentException("Điện/nước theo chỉ số phải được phát hành từ chỉ số đã duyệt tại Quản lý chỉ số");

        // Chống tạo trùng: Cùng căn hộ, Cùng tháng, Cùng loại phí
        Bill bill = getOrCreateBill(apartment, request.getBillingMonth());
        requireDraft(bill);
        if(feeType.getCode()==com.dancu.qlydancu.model.enums.FeeTypeCode.PARKING&&!parkingEligible(bill))
            throw new IllegalArgumentException("Căn hộ chưa có xe đăng ký đang hoạt động");
        
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
            if(feeType.getDefaultAmount()==null)throw new IllegalArgumentException("Chưa cấu hình số tiền phí cố định");
            finalAmount = feeType.getDefaultAmount();
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
            if(feeType.getUnitPrice()==null||feeType.getUnitPrice()<0)throw new IllegalArgumentException("Chưa cấu hình đơn giá hợp lệ");
            long unitPrice = feeType.getUnitPrice();
            detail.setUnitPrice(unitPrice);
            
            finalAmount = usage.multiply(java.math.BigDecimal.valueOf(unitPrice)).longValue();
        } else {
            // Các loại phí khác nếu có
            finalAmount = request.getAmount() != null ? request.getAmount() : 0L;
            detail.setQuantity(java.math.BigDecimal.ONE);
            detail.setUnitPrice(finalAmount);
        }

        detail.setAmount(finalAmount);
        if(finalAmount<0)throw new IllegalArgumentException("Số tiền không được âm");
        billDetailRepository.save(detail);

        // Cập nhật tổng tiền hóa đơn cha
        long currentTotal = (bill.getTotalAmount() != null) ? bill.getTotalAmount() : 0L;
        bill.setTotalAmount(Math.addExact(currentTotal,finalAmount));
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
                    if (!bill.isDraft()) continue;
                    addFixedFees(bill);
                    for(var reading:meterReadings.findByApartment_Id(apt.getId()))
                        if(reading.getApprovalStatus()==com.dancu.qlydancu.model.enums.MeterReadingStatus.APPROVED
                            &&ElectricityCalculation.period(reading.getBillingMonth()).equals(ElectricityCalculation.period(billingMonth)))attachApprovedReading(reading);
                    billRepository.save(bill);
                }
            }
        }
    }

    @Transactional
    public void confirmBillPayment(Long billId, com.dancu.qlydancu.dto.BillConfirmRequest request) {
        Bill bill = billRepository.findLockedById(billId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn"));
        if(bill.isDraft())throw new IllegalStateException("Không xác nhận thanh toán hóa đơn nháp");

        if (bill.getStatus() == BillDetailStatus.PAID) {
            throw new RuntimeException("Hóa đơn đã thanh toán trước đó");
        }

        List<BillDetail> details = billDetailRepository.findByBill_Id(billId);
        if(details.stream().anyMatch(d->d.getStatus()==BillDetailStatus.PENDING))
            throw new IllegalStateException("Có giao dịch đang chờ xác nhận; hãy duyệt hoặc từ chối giao dịch trước");
        
        List<BillDetail> remaining = details.stream().filter(d -> d.getStatus() != BillDetailStatus.PAID).toList();
        long remainingAmount = remaining.stream().mapToLong(d -> d.getAmount() != null ? d.getAmount() : 0L).sum();
        if (remaining.isEmpty() || remainingAmount <= 0) throw new IllegalStateException("Không có khoản phí còn phải xác nhận thanh toán");
        // Record only the remaining balance, preserving prior successful partial payments.
        Payment payment = new Payment();
        payment.setAmount(remainingAmount);
        payment.setStatus(com.dancu.qlydancu.model.enums.PaymentStatus.SUCCESS);
        payment.setPaidAt(request.paymentDate() != null ? request.paymentDate() : billEmailEvents.now());
        String method=request.paymentMethod()==null?"CASH":request.paymentMethod();
        if(method.equals("TRANSFER"))method="BANK_TRANSFER";
        payment.setPaymentMethod(com.dancu.qlydancu.model.enums.PaymentMethod.valueOf(method));
        payment.setTransactionCode(request.transactionCode());
        payment.setNote(request.note());
        payment.setConfirmedBy(actor());
        
        // Phải lưu payment trước để có ID nếu PaymentDetail dùng id compound
        payment = paymentRepository.save(payment);

        for (BillDetail bd : remaining) {
            bd.setStatus(BillDetailStatus.PAID);
            payment.addPaymentDetail(bd);
        }

        bill.setStatus(BillDetailStatus.PAID);
        billRepository.save(bill);
        billDetailRepository.saveAll(details);
        paymentRepository.save(payment);

        billEmailEvents.paid(bill);
    }

    public com.dancu.qlydancu.dto.BillStatisticsResponse getStatistics() {
        List<Bill> allBills = billRepository.findAll().stream().filter(b->!b.isDraft()).toList();
        long totalCollected=0,totalUnpaid=0,overdueCount=0;
        var unpaidApartments=new java.util.HashSet<Long>();
        var now=billEmailEvents.now();
        for(var bill:allBills) {
            boolean overdue=false;
            for(var line:billDetailRepository.findByBill_Id(bill.getId())) {
                long amount=line.getAmount()==null?0:line.getAmount();
                if(line.getStatus()==BillDetailStatus.PAID)totalCollected=Math.addExact(totalCollected,amount);
                else {totalUnpaid=Math.addExact(totalUnpaid,amount);unpaidApartments.add(bill.getApartment().getId());
                    if(line.getDueDate()!=null&&line.getDueDate().isBefore(now))overdue=true;}
            }
            if(overdue)overdueCount++;
        }
        long unpaidCount=unpaidApartments.size();
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
        Long owner=billRepository.findApartmentId(billDetailRepository.findBillId(request.getId()).orElseThrow()).orElseThrow();
        lockApartmentBilling(owner);
        BillDetail detail = billDetailRepository.findById(request.getId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản phí với ID: " + request.getId()));
        
        Bill bill = detail.getBill();
        if(bill!=null)requireDraft(bill);
        if(bill != null && (managedMeterFee(detail.getFeeType(),bill.getBillingMonth()) ||
            request.getFeeTypeId()!=null && managedMeterFee(feeTypeRepository.findById(request.getFeeTypeId()).orElseThrow(),bill.getBillingMonth())))
            throw new IllegalArgumentException("Không sửa khoản điện/nước theo chỉ số qua biểu mẫu phí; cần quy trình điều chỉnh có lịch sử");
        if (bill == null) {
            throw new RuntimeException("Khoản phí không thuộc hóa đơn nào (Dữ liệu lỗi)");
        }
        // Kiểm tra xem hóa đơn tổng đã thanh toán chưa
        if (bill.getStatus() == BillDetailStatus.PAID) {
            throw new RuntimeException("Hóa đơn đã thanh toán, không được phép sửa");
        }

        if (detail.getStatus() == BillDetailStatus.PAID) throw new IllegalStateException("Không sửa khoản phí đã thanh toán");
        long oldAmount = detail.getAmount();

        if (request.getFeeTypeId() != null) {
            FeeType feeType = feeTypeRepository.findById(request.getFeeTypeId())
                .orElseThrow(() -> new RuntimeException("Loại phí không hợp lệ"));
            detail.setFeeType(feeType);
            if(feeType.getCode()==com.dancu.qlydancu.model.enums.FeeTypeCode.PARKING&&!parkingEligible(bill))throw new IllegalArgumentException("Căn hộ chưa có xe đăng ký đang hoạt động");
            if(billDetailRepository.findByBillIdAndFeeTypeId(bill.getId(),feeType.getId()).filter(other->!other.getId().equals(detail.getId())).isPresent())throw new IllegalStateException("Loại phí đã tồn tại trong hóa đơn");
        }

        if (request.getAmount() != null) {
            if(request.getAmount()<0)throw new IllegalArgumentException("Số tiền không được âm");
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
        if (request.getBillingMonth() != null && !ElectricityCalculation.period(request.getBillingMonth()).equals(ElectricityCalculation.period(bill.getBillingMonth()))) {
            if(managedMeterFee(detail.getFeeType(),request.getBillingMonth()))throw new IllegalArgumentException("Không chuyển phí điện/nước sang kỳ khác");
            Bill targetBill = getOrCreateBill(bill.getApartment(),request.getBillingMonth());
            requireDraft(targetBill);
            if(billDetailRepository.findByBillIdAndFeeTypeId(targetBill.getId(),detail.getFeeType().getId()).isPresent())throw new IllegalStateException("Đã có loại phí này ở kỳ đích");

            
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
        return details.stream().filter(d -> !d.getBill().isDraft()).map(d -> new BillDetailRowResponse(
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
        
        return bills.stream().filter(bill -> !bill.isDraft()).map(bill -> {
            List<BillDetail> details = billDetailRepository.findByBill_Id(bill.getId());
            java.time.LocalDateTime firstDueDate = details.isEmpty() ? null : details.get(0).getDueDate();

            return new AdminAggregatedBillResponse(
                bill.getId(),
                bill.getApartment().getCode(),
                user.getName(),
                bill.getBillingMonth(),
                bill.getTotalAmount(),
                firstDueDate,
                calculateBillStatus(bill, details),bill.getIssuanceStatus(),bill.getIssuedAt()
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
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Bạn không có quyền xem hóa đơn này");
        }
        if(bill.isDraft())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Hóa đơn chưa phát hành");

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
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public void updateBillDetailStatus(Long detailId, BillDetailStatus newStatus) {
        Long owner=billRepository.findApartmentId(billDetailRepository.findBillId(detailId).orElseThrow()).orElseThrow();
        lockApartmentBilling(owner);
        BillDetail detail = billDetailRepository.findById(detailId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi tiết hóa đơn ID: " + detailId));
        if(detail.getBill().isDraft())throw new IllegalStateException("Không cập nhật thanh toán hóa đơn nháp");
        if(detail.getStatus()==newStatus)return;
        if(detail.getStatus()!=BillDetailStatus.UNPAID||newStatus!=BillDetailStatus.PAID)
            throw new IllegalStateException("Dùng quy trình duyệt giao dịch; không mở lại hoặc gán trạng thái chờ thủ công");
        if(detail.getAmount()==null||detail.getAmount()<0)throw new IllegalStateException("Số tiền không hợp lệ");
        var payment=new Payment();payment.setAmount(detail.getAmount());payment.setStatus(com.dancu.qlydancu.model.enums.PaymentStatus.SUCCESS);
        payment.setPaymentMethod(com.dancu.qlydancu.model.enums.PaymentMethod.CASH);payment.setPaidAt(billEmailEvents.now());payment.setConfirmedBy(actor());
        payment.addPaymentDetail(detail);paymentRepository.save(payment);
        detail.setStatus(BillDetailStatus.PAID);billDetailRepository.saveAndFlush(detail);
        var bill=detail.getBill();
        if(billDetailRepository.findByBill_Id(bill.getId()).stream().allMatch(line->line.getStatus()==BillDetailStatus.PAID)) {
            bill.setStatus(BillDetailStatus.PAID);billRepository.save(bill);billEmailEvents.paid(bill);
        }
    }
}
