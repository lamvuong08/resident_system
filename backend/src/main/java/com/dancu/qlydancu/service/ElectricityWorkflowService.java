package com.dancu.qlydancu.service;

import com.dancu.qlydancu.billing.BillEmailEventPublisher;
import com.dancu.qlydancu.dto.*;
import com.dancu.qlydancu.dto.ElectricityWorkflowRequest.*;
import com.dancu.qlydancu.model.*;
import com.dancu.qlydancu.model.enums.*;
import com.dancu.qlydancu.repo.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ElectricityWorkflowService {
    private final MeteringPolicy policy;
    private final MeterPricingService pricing;
    private final MeterReadingRepository readings;
    private final MeterReadingAuditRepository audits;
    private final MeterTariffRepository tariffs;
    private final MeterTypeRepository meters;
    private final ApartmentRepository apartments;
    private final HouseholdRepository households;
    private final ResidentRepository residents;
    private final BillRepository bills;
    private final BillDetailRepository details;
    private final FeeTypeRepository fees;
    private final BillService billing;
    private final BillEmailEventPublisher events;
    private final JdbcTemplate jdbc;
    private final com.dancu.qlydancu.billing.BillingReminderProperties emailSettings;
    private final TransactionTemplate tx;
    public ElectricityWorkflowService(MeterReadingRepository readings,MeterReadingAuditRepository audits,MeterTariffRepository tariffs,
        MeterTypeRepository meters,ApartmentRepository apartments,HouseholdRepository households,ResidentRepository residents,
        BillRepository bills,BillDetailRepository details,FeeTypeRepository fees,BillService billing,BillEmailEventPublisher events,
        JdbcTemplate jdbc,PlatformTransactionManager manager,com.dancu.qlydancu.billing.BillingReminderProperties emailSettings,
        MeteringPolicy policy,MeterPricingService pricing) {
        this.policy=policy;this.pricing=pricing;
        this.readings=readings;this.audits=audits;this.tariffs=tariffs;this.meters=meters;this.apartments=apartments;
        this.households=households;this.residents=residents;this.bills=bills;this.details=details;this.fees=fees;
        this.billing=billing;this.events=events;this.jdbc=jdbc;this.emailSettings=emailSettings;
        tx=new TransactionTemplate(manager);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }
    @org.springframework.beans.factory.annotation.Autowired private org.springframework.context.ApplicationEventPublisher decisionEvents;
    private String actor() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Cần đăng nhập");
        return auth.getName();
    }
    private List<MeterReading> sameMeter(long apartment,long type) { return readings.findByApartmentIdAndMeterTypeId(apartment,type); }
    private MeterReading previous(MeterReading reading) {
        var target=ElectricityCalculation.period(reading.getBillingMonth());
        return sameMeter(reading.getApartment().getId(),reading.getMeterType().getId()).stream()
            .filter(r->MeterKind.of(reading.getMeterType())!=MeterKind.WATER || r.getApprovalStatus()!=MeterReadingStatus.REJECTED)
            .filter(r->ElectricityCalculation.period(r.getBillingMonth()).isBefore(target))
            .max(Comparator.comparing(r->ElectricityCalculation.period(r.getBillingMonth()))).orElse(null);
    }
    private void validate(MeterReading reading) {
        var previous=previous(reading);
        BigDecimal old=previous==null?reading.getOldReading():previous.getNewReading();
        if(old==null||old.signum()<0||reading.getNewReading()==null||reading.getNewReading().compareTo(old)<0)
            throw new IllegalArgumentException("Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ hợp lệ");
        if(reading.getOldReading().compareTo(old)!=0)throw new IllegalArgumentException("Chỉ số kỳ trước đã thay đổi; cần STAFF kiểm tra và gửi lại");
        var target=ElectricityCalculation.period(reading.getBillingMonth());
        for(var later:sameMeter(reading.getApartment().getId(),reading.getMeterType().getId())) {
            if(MeterKind.of(reading.getMeterType())==MeterKind.WATER && later.getApprovalStatus()==MeterReadingStatus.REJECTED)continue;
            if(ElectricityCalculation.period(later.getBillingMonth()).isAfter(target) && reading.getNewReading().compareTo(later.getNewReading())>0)
                throw new IllegalArgumentException("Chỉ số mới vượt quá chỉ số của kỳ sau");
        }
    }
    private List<MeterTariff> prices(MeterReading reading) {return pricing.prices(reading.getMeterType(),reading.getBillingMonth());}
    private void estimate(MeterReading reading) {
        validate(reading);var price=prices(reading);reading.setUsageAmount(reading.getNewReading().subtract(reading.getOldReading()));
        reading.setEstimatedAmount(pricing.amount(reading.getUsageAmount(),price));
        reading.setTariffSnapshot(pricing.snapshot(reading.getMeterType(),price));
    }
    private void version(MeterReading reading,Long expected) {
        if(expected==null||!expected.equals(reading.getVersion()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Dữ liệu đã thay đổi; vui lòng tải lại trước khi thao tác");
    }
    private void audit(MeterReading reading,String action,String reason) {
        readings.saveAndFlush(reading);
        var row=new MeterReadingAudit();row.setReadingId(reading.getId());row.setAction(action);row.setActor(actor());row.setReason(reason);
        row.setOldReading(reading.getOldReading());row.setNewReading(reading.getNewReading());row.setEstimatedAmount(reading.getEstimatedAmount());
        row.setTariffSnapshot(reading.getTariffSnapshot());row.setReadingVersion(reading.getVersion());row.setBillDetailId(reading.getIssuedBillDetailId());
        row.setCreatedAt(events.now());audits.save(row);
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('STAFF')")
    public void record(MeterReadingRequest request) {
        if(request.getApartmentId()==null||request.getNewReading()==null)throw new IllegalArgumentException("Thiếu căn hộ hoặc chỉ số mới");
        if(request.getNewReading().scale()>2||request.getNewReading().precision()>19)throw new IllegalArgumentException("Chỉ số tối đa 2 chữ số thập phân");
        var apartment=apartments.findLockedById(request.getApartmentId()).orElseThrow(()->new IllegalArgumentException("Không tìm thấy căn hộ"));
        String month=ElectricityCalculation.month(request.getBillingMonth());var type=policy.resolve(request.getMeterTypeId(),request.getService());policy.validatePeriod(type,month);
        var found=sameMeter(apartment.getId(),type.getId()).stream().filter(r->ElectricityCalculation.month(r.getBillingMonth()).equals(month)).toList();
        if(found.size()>1)throw new IllegalArgumentException("Dữ liệu kỳ điện cũ bị trùng; cần đối soát trước khi ghi");
        var reading=found.isEmpty()?new MeterReading():found.getFirst();
        if(reading.getId()!=null) {
            version(reading,request.getExpectedVersion());
            if(reading.getApprovalStatus()!=MeterReadingStatus.PENDING_APPROVAL&&reading.getApprovalStatus()!=MeterReadingStatus.REJECTED)
                throw new IllegalArgumentException("Chỉ sửa bản ghi chờ duyệt hoặc bị từ chối");
        }
        reading.setApartment(apartment);reading.setMeterType(type);reading.setBillingMonth(month);reading.setPeriodKey(ElectricityCalculation.period(month).toString());
        var prev=previous(reading);reading.setOldReading(prev==null?BigDecimal.ZERO:prev.getNewReading());reading.setNewReading(request.getNewReading());
        estimate(reading);
        // Never silently recalculate a later approved/issued reading or an old payable electricity charge.
        for(var later:sameMeter(apartment.getId(),type.getId())) {
            if(ElectricityCalculation.period(later.getBillingMonth()).isAfter(ElectricityCalculation.period(month)) &&
                later.getApprovalStatus()!=MeterReadingStatus.PENDING_APPROVAL&&later.getApprovalStatus()!=MeterReadingStatus.REJECTED)
                throw new IllegalArgumentException("Có kỳ sau đã duyệt/phát hành; cần quy trình điều chỉnh có kiểm soát");
        }
        reading.setApprovalStatus(MeterReadingStatus.PENDING_APPROVAL);reading.setRecordedBy(actor());reading.setUpdatedAt(events.now());
        reading.setApprovedAt(null);reading.setApprovedBy(null);reading.setRejectionReason(null);audit(reading,"SUBMITTED",null);
    }
    private MeterReading locked(Item item) {
        // Read scalar identifiers before locks; hydrate the entity only after acquiring the apartment lock.
        var owner=jdbc.queryForList("SELECT apartment_id FROM meter_readings WHERE id=?",Long.class,item.id());
        if(owner.isEmpty())throw new IllegalArgumentException("Không tìm thấy bản ghi");
        billing.lockApartmentBilling(owner.getFirst());
        apartments.findLockedById(owner.getFirst()).orElseThrow();
        return readings.findById(item.id()).orElseThrow();
    }
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public BatchResult approve(Batch request) {
        return batch(request,false);
    }
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public BatchResult issue(Batch request) {
        if(request.dueDate()==null || request.dueDate().isBefore(events.now().toLocalDate()))throw new IllegalArgumentException("Hạn thanh toán phải từ hôm nay trở đi");
        return batch(request,true);
    }
    private BatchResult batch(Batch request,boolean issue) {
        var seen=new HashSet<Long>();var result=new ArrayList<Result>();
        for(var item:request.items()) {
            if(!seen.add(item.id())) {result.add(new Result(item.id(),false,false,null,"Bản ghi được chọn trùng"));continue;}
            try {
                result.add(tx.execute(status -> {
                    if(issue) {
                        // Same order as the email worker: existing bill first, apartment second.
                        var ids=jdbc.queryForList("""
                            SELECT b.id FROM bills b JOIN meter_readings r ON r.apartment_id=b.apartment_id
                            WHERE r.id=? AND (b.billing_month=r.billing_month OR b.billing_month=r.period_key) ORDER BY b.id
                            """,Long.class,item.id());
                        for(long id:ids)jdbc.queryForList("SELECT id FROM bills WHERE id=? FOR UPDATE",Long.class,id);
                    }
                    var reading=locked(item);
                    if(issue && reading.getApprovalStatus()==MeterReadingStatus.ISSUED && reading.getIssuedBillDetailId()!=null) {
                        var detail=details.findById(reading.getIssuedBillDetailId()).orElseThrow();
                        return new Result(item.id(),true,true,detail.getBill().getId(),"Đã phát hành trước đó; không tạo thêm khoản thu/email");
                    }
                    version(reading,item.version());
                    if(issue) return publish(reading,request.dueDate());
                    if(reading.getApprovalStatus()!=MeterReadingStatus.PENDING_APPROVAL)throw new IllegalArgumentException("Chỉ duyệt bản ghi đang chờ kiểm tra");
                    estimate(reading);reading.setApprovalStatus(MeterReadingStatus.APPROVED);reading.setApprovedBy(actor());reading.setApprovedAt(events.now());
                    reading.setRejectionReason(null);audit(reading,"APPROVED",null);
                    var draft=billing.attachApprovedReading(reading);
                    return new Result(item.id(),true,false,draft==null?null:draft.getId(),"Đã duyệt và cập nhật hóa đơn nháp; chưa phát hành");
                }));
            } catch(RuntimeException error) {
                String message=error instanceof ResponseStatusException response?response.getReason():error instanceof IllegalArgumentException||error instanceof IllegalStateException?error.getMessage():
                    "Không xử lý được bản ghi; dữ liệu đã được giữ nguyên, vui lòng tải lại hoặc kiểm tra cấu hình/database";
                result.add(new Result(item.id(),false,false,null,message));
            }
        }
        return BatchResult.of(List.copyOf(result));
    }
    @Transactional
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public void reject(long id,Rejection request) {
        var reading=locked(new Item(id,request.version()));version(reading,request.version());
        if(reading.getApprovalStatus()!=MeterReadingStatus.PENDING_APPROVAL && reading.getApprovalStatus()!=MeterReadingStatus.APPROVED)
            throw new IllegalArgumentException("Chỉ từ chối bản ghi chưa phát hành đang chờ duyệt/đã duyệt");
        reading.setApprovalStatus(MeterReadingStatus.REJECTED);reading.setRejectionReason(request.reason().trim());
        reading.setApprovedAt(null);reading.setApprovedBy(null);
        billing.detachRejectedReading(reading);audit(reading,"REJECTED",request.reason().trim());
        if(decisionEvents!=null && reading.getRecordedBy()!=null)decisionEvents.publishEvent(new MeterDecisionNotification.Event(
            reading.getRecordedBy(),reading.getApartment().getCode(),reading.getBillingMonth(),MeterKind.of(reading.getMeterType()).label,request.reason().trim()));
    }
    public String blockedReason(MeterReading reading) {
        try {
            if(reading.getApprovalStatus()!=MeterReadingStatus.APPROVED)return "Chỉ số chưa ở trạng thái đã duyệt";
            validate(reading);var price=prices(reading);
            if(!Objects.equals(reading.getTariffSnapshot(),pricing.snapshot(reading.getMeterType(),price)) ||
                !Objects.equals(reading.getEstimatedAmount(),pricing.amount(reading.getNewReading().subtract(reading.getOldReading()),price)))
                return "Biểu giá/số liệu đã thay đổi; cần từ chối và gửi duyệt lại";
            var household=households.findByApartment_Code(reading.getApartment().getCode()).orElse(null);
            if(household==null||residents.findByHouseholdId(household.getId()).isEmpty())return "Căn hộ chưa có hộ gia đình/cư dân hợp lệ";
            var user=household.getUser();
            if(user==null||user.getStatus()!=UserStatus.ACTIVE||user.getRoles()!=UserRole.ROLE_USER ||
                !com.dancu.qlydancu.billing.BillingReminderRepository.validEmail(user.getEmail()))return "Tài khoản/email cư dân không hợp lệ";
            var fee=fees.findByCode(MeterKind.of(reading.getMeterType()).feeCode).orElse(null);if(fee==null)return "Chưa cấu hình loại phí " + MeterKind.of(reading.getMeterType()).label;
            for(var bill:bills.findByApartment_Id(reading.getApartment().getId())) {
                if(ElectricityCalculation.period(bill.getBillingMonth()).equals(ElectricityCalculation.period(reading.getBillingMonth()))) {
                    if(!bill.isDraft())return "Hóa đơn tổng kỳ này đã thanh toán; chưa hỗ trợ mở lại";
                    if(details.findByBillIdAndFeeTypeId(bill.getId(),fee.getId()).filter(d->!Objects.equals(d.getMeterReadingId(),reading.getId())).isPresent())return "Đã có khoản " + MeterKind.of(reading.getMeterType()).label + " của căn hộ trong kỳ này; cần đối soát, không cộng trùng";
                }
            }
            return null;
        } catch(RuntimeException error) {return error instanceof IllegalArgumentException?error.getMessage():"Dữ liệu chưa hợp lệ; cần kiểm tra lại";}
    }
    private Result publish(MeterReading reading,LocalDate due) {
        // Compatibility endpoint now issues the entire aggregate, never a single fee.
        if(reading.getApprovalStatus()!=MeterReadingStatus.APPROVED)throw new IllegalArgumentException("Chỉ số chưa được duyệt");
        var linked=details.findByMeterReadingId(reading.getId()).orElseThrow(
            ()->new IllegalArgumentException("Chỉ số đã duyệt chưa gắn vào hóa đơn nháp; cần khởi tạo lại kỳ để tổng hợp"));
        var bill=billing.issueBill(linked.getBill().getId(),due,null);
        return new Result(reading.getId(),true,false,bill.getId(),"Đã phát hành toàn bộ hóa đơn tổng");
    }
    public void enrich(ApartmentMeterReadingResponse response,MeterReading reading) {
        if(reading==null) {response.setBillStatus(null);return;}
        response.setReadingId(reading.getId());response.setVersion(reading.getVersion());
        response.setApprovalStatus(reading.getApprovalStatus()==null?"LEGACY_REVIEW":reading.getApprovalStatus().name());
        response.setOldReading(reading.getOldReading());response.setNewReading(reading.getNewReading());response.setUsageAmount(reading.getUsageAmount());
        response.setCalculatedAmount(Objects.requireNonNullElse(reading.getEstimatedAmount(),response.getCalculatedAmount()));
        response.setRecordedBy(reading.getRecordedBy());response.setApprovedBy(reading.getApprovedBy());response.setApprovedAt(reading.getApprovedAt());
        response.setRecordedAt(reading.getUpdatedAt()==null?reading.getCreatedAt():reading.getUpdatedAt());response.setRejectionReason(reading.getRejectionReason());
        response.setTariffSnapshot(reading.getTariffSnapshot());response.setIssuedBillDetailId(reading.getIssuedBillDetailId());
        details.findByMeterReadingId(reading.getId()).ifPresent(d->{response.setLinkedBillId(d.getBill().getId());response.setLinkedBillStatus(d.getBill().getIssuanceStatus());});
        response.setIsLocked(reading.getApprovalStatus()!=MeterReadingStatus.PENDING_APPROVAL && reading.getApprovalStatus()!=MeterReadingStatus.REJECTED);
        String reason=blockedReason(reading);response.setEligibleForIssue(reason==null);response.setIssueBlockedReason(reason);
    }
    @Transactional(readOnly=true)
    public List<MeterReadingAudit> history(long id) {return audits.findByReadingIdOrderByIdAsc(id);}
}
