package com.dancu.qlydancu.billing;

import com.dancu.qlydancu.model.Bill;
import java.time.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/** Publishes only from backend issuance/confirmation transactions; never from the scheduler or UI. */
@Component
public class BillEmailEventPublisher {
    public record Event(long billId, BillingReminderType type,Long meterReadingId) {
        public Event(long billId,BillingReminderType type) {this(billId,type,null);}
    }
    private final ApplicationEventPublisher events;
    private final Clock clock;
    public BillEmailEventPublisher(ApplicationEventPublisher events,@Qualifier("billingReminderClock") Clock clock) {
        this.events=events; this.clock=clock;
    }
    public LocalDateTime now() { return LocalDateTime.now(clock.withZone(ZoneId.of("Asia/Ho_Chi_Minh"))); }
    public void issued(Bill bill) {
        if (bill.getIssuedAt()!=null || bill.getTotalAmount()==null || bill.getTotalAmount()<=0) return;
        bill.setIssuedAt(now());
        events.publishEvent(new Event(bill.getId(),BillingReminderType.BILL_CREATED));
    }
    public void paid(Bill bill) {
        if(bill.getPaymentConfirmedAt()!=null) return;
        bill.setPaymentConfirmedAt(now());
        events.publishEvent(new Event(bill.getId(),BillingReminderType.BILL_PAID));
    }
    public void electricityIssued(Bill bill,long readingId) {
        if(bill.getIssuedAt()==null)bill.setIssuedAt(now());
        events.publishEvent(new Event(bill.getId(),BillingReminderType.BILL_CREATED,readingId));
    }
}
