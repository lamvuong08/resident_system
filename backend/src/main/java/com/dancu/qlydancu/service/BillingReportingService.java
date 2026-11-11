package com.dancu.qlydancu.service;

import com.dancu.qlydancu.model.*;
import com.dancu.qlydancu.model.enums.*;
import com.dancu.qlydancu.repo.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly=true)
@org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
public class BillingReportingService {
    private final BillRepository bills;
    private final BillDetailRepository details;
    private final MeterReadingRepository readings;
    private final PaymentRepository payments;
    public BillingReportingService(BillRepository bills,BillDetailRepository details,MeterReadingRepository readings,PaymentRepository payments) {
        this.bills=bills;this.details=details;this.readings=readings;this.payments=payments;
    }
    public record Overview(long totalCollected,long totalUnpaid,long unpaidHouseholds,long overdueBills,long pendingElectricity,long pendingWater,long draftBills) {}
    private boolean period(String value,String filter) {return filter==null||filter.isBlank()||ElectricityCalculation.period(value).equals(ElectricityCalculation.period(filter));}
    public Overview overview(String month) {
        var selected=bills.findAll().stream().filter(b->period(b.getBillingMonth(),month)).toList();
        long collected=0,unpaid=0,overdue=0;var households=new HashSet<Long>();
        for(var b:selected)if(!b.isDraft()) {
            boolean late=false;
            for(var d:details.findByBill_Id(b.getId())) {
                long amount=Objects.requireNonNullElse(d.getAmount(),0L);
                if(d.getStatus()==BillDetailStatus.PAID)collected=Math.addExact(collected,amount);
                else {unpaid=Math.addExact(unpaid,amount);households.add(b.getApartment().getId());
                    if(d.getDueDate()!=null&&d.getDueDate().isBefore(LocalDateTime.now()))late=true;}
            }
            if(late)overdue++;
        }
        long electric=0,water=0;
        for(var r:readings.findAll())if(r.getApprovalStatus()==MeterReadingStatus.PENDING_APPROVAL&&period(r.getBillingMonth(),month)) {
            if(MeterKind.of(r.getMeterType())==MeterKind.WATER)water++;else electric++;
        }
        return new Overview(collected,unpaid,households.size(),overdue,electric,water,selected.stream().filter(Bill::isDraft).count());
    }
    public record InvoiceRef(Long id,String apartmentCode,String billingMonth) {}
    public record History(Long id,String transactionCode,Long amount,String paymentMethod,String status,LocalDateTime paidAt,String confirmedBy,List<InvoiceRef> invoices) {}
    public Page<History> history(String month,String apartment,String status,Pageable pageable) {
        var result=payments.findAll().stream().sorted(Comparator.comparing(Payment::getId).reversed())
            .filter(p->status==null||status.isBlank()||p.getStatus().name().equals(status))
            .map(p->{var refs=p.getPaymentDetails().stream().map(d->d.getBillDetail().getBill())
                .filter(b->period(b.getBillingMonth(),month)&&(apartment==null||apartment.isBlank()||b.getApartment().getCode().toLowerCase(Locale.ROOT).contains(apartment.trim().toLowerCase(Locale.ROOT))))
                .map(b->new InvoiceRef(b.getId(),b.getApartment().getCode(),b.getBillingMonth())).distinct().toList();
                return new History(p.getId(),p.getTransactionCode(),p.getAmount(),p.getPaymentMethod()==null?null:p.getPaymentMethod().name(),p.getStatus().name(),p.getPaidAt(),p.getConfirmedBy(),refs);})
            .filter(p->!p.invoices().isEmpty()).toList();
        int start=(int)Math.min(pageable.getOffset(),result.size()),end=Math.min(start+pageable.getPageSize(),result.size());
        return new PageImpl<>(result.subList(start,end),pageable,result.size());
    }
}
