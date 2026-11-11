package com.dancu.qlydancu.billing;

import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import com.dancu.qlydancu.model.enums.NotificationType;
import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.service.NotificationService;

@Service
@BillingReminderEnabled
public class EmailOutboxService {
    private final EmailOutboxRepository outbox;
    private final BillingReminderRepository bills;
    private final BillingReminderProperties settings;
    private final EmailTemplateService templates;
    private final NotificationService notifications;
    private final UserRepository users;
    private final Clock clock;
    private final ServiceSuspensionRepository services;
    private final TransactionTemplate tx;
    private final TransactionTemplate lifecycleTx;
    public EmailOutboxService(EmailOutboxRepository outbox, BillingReminderRepository bills,
            BillingReminderProperties settings, EmailTemplateService templates, NotificationService notifications,
            UserRepository users, @Qualifier("billingReminderClock") Clock clock, PlatformTransactionManager manager,ServiceSuspensionRepository services) {
        this.outbox=outbox; this.bills=bills; this.settings=settings; this.templates=templates;
        this.notifications=notifications; this.users=users; this.clock=clock;
        this.services=services;
        this.tx=new TransactionTemplate(manager);
        this.lifecycleTx=new TransactionTemplate(manager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }
    public LocalDateTime now() { return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC); }
    public LocalDate today() { return LocalDate.now(clock.withZone(ZoneId.of(settings.getZone()))); }

    public boolean enqueueReminder(long billId) {
        return enqueueReminder(billId,BillingReminderType.BILL_REMINDER);
    }
    public boolean enqueueReminder(long billId,BillingReminderType type) {
        if(!type.scheduledReminder())throw new IllegalArgumentException("Only scheduled reminders are allowed");
        return Boolean.TRUE.equals(tx.execute(status -> enqueue(billId,type)));
    }
    public boolean enqueueLifecycle(long billId,BillingReminderType type) {
        if(type!=BillingReminderType.BILL_CREATED && type!=BillingReminderType.BILL_PAID)
            throw new IllegalArgumentException("Only issuance and backend confirmation are lifecycle events");
        return Boolean.TRUE.equals(lifecycleTx.execute(status -> {
            if(type==BillingReminderType.BILL_PAID) {
                outbox.cancelDebtEmails(billId,now());
                services.clearPaidPending(billId,now());
            }
            return enqueue(billId,type);
        }));
    }
    public boolean enqueueElectricity(long billId,long readingId) {
        return Boolean.TRUE.equals(lifecycleTx.execute(status -> {
            bills.lockBill(billId);
            var loaded=bills.load(billId).flatMap(b->bills.electricity(b,readingId)).filter(b->b.eligible(BillingReminderType.BILL_CREATED,today()));
            if(loaded.isEmpty())throw new IllegalArgumentException("Không tìm thấy dữ liệu/người nhận hợp lệ cho email phát hành chỉ số");
            var bill=loaded.get();String key=EmailOutboxRepository.electricityKey(readingId,bill.userId());
            if(outbox.exists(key))return false;
            var template=render(bill,BillingReminderType.BILL_CREATED,null);
            outbox.insert(bill,BillingReminderType.BILL_CREATED,template,now(),null,readingId);
            notifications.sendNotificationToUser(users.findById(bill.userId()).orElseThrow(),template.subject(),
                "Hóa đơn kỳ "+bill.billingMonth()+" đã phát hành. Số tiền: "+bill.total()+" VNĐ.",NotificationType.PAYMENT,"/user/payment","BILL_CREATED");
            outbox.notificationCreated(key,now());return true;
        }));
    }
    private boolean enqueue(long billId,BillingReminderType type) {
        bills.lockBill(billId);
        var loaded=bills.load(billId);
        if(loaded.isEmpty()||!loaded.get().eligible(type,today()))return false;
        var bill=loaded.get();String key=EmailOutboxRepository.key(bill,type);
        var template=render(bill,type,null);
        if(outbox.exists(key))return type.scheduledReminder() && outbox.rearmReminder(key,template,now(),settings.getMaxAttempts());
        outbox.insert(bill,type,template,now());
        var recipient=users.findById(bill.userId()).orElseThrow();
        notifications.sendNotificationToUser(recipient,template.subject(),type.message+" Hóa đơn #"+billId+
            ", kỳ "+bill.billingMonth()+". "+(type==BillingReminderType.BILL_PAID?"Đã thanh toán "+bill.paidAmount():"Còn phải thanh toán "+bill.outstanding())+" VNĐ.",
            NotificationType.PAYMENT,"/user/payment",type.name());
        outbox.notificationCreated(key,now());
        return true;
    }
    public boolean enqueueSuspension(long eventId) {
        return Boolean.TRUE.equals(lifecycleTx.execute(status -> {
            var event=services.event(eventId).orElseThrow();
            bills.lockBill(event.billId());
            services.lockApartment(event.apartmentId());
            var loaded=bills.load(event.billId()).filter(b -> suspensionEligible(b,event));
            String key=EmailOutboxRepository.suspensionKey(eventId);
            if(loaded.isEmpty()||outbox.exists(key))return false;
            var bill=loaded.get();var template=render(bill,BillingReminderType.BILL_SERVICE_SUSPENDED,event);
            outbox.insert(bill,BillingReminderType.BILL_SERVICE_SUSPENDED,template,now(),eventId);
            String labels=EmailTemplateService.serviceLabels(services.suspendedForEvent(event));
            notifications.sendNotificationToUser(users.findById(bill.userId()).orElseThrow(),template.subject(),
                (event.simulated()?"[MÔ PHỎNG] ":"")+"Dịch vụ "+labels+" tại căn hộ "+bill.apartment()+" đã được xác nhận tạm ngừng. Vui lòng liên hệ Ban quản lý để được hỗ trợ.",
                NotificationType.PAYMENT,"/user/payment",BillingReminderType.BILL_SERVICE_SUSPENDED.name());
            outbox.notificationCreated(key,now());return true;
        }));
    }
    private boolean suspensionEligible(BillingReminderData bill,ServiceSuspensionRepository.Event event) {
        if(!"SUSPEND".equals(event.action()) || event.userId()!=bill.userId() || event.householdId()!=bill.householdId() ||
            bill.outstanding()<=0 || bill.pending() || !("UNPAID".equals(bill.status())||"PENDING".equals(bill.status())))return false;
        var actual=services.suspendedForEvent(event);
        return !actual.isEmpty() && services.overdueServices(bill.billId(),today()).containsAll(actual);
    }
    private EmailTemplateService.Template render(BillingReminderData bill,BillingReminderType type,ServiceSuspensionRepository.Event event) {
        var actual=event==null?services.suspendedAtBillApartment(bill.billId()):services.suspendedForEvent(event);
        return templates.render(bill,type,today(),actual,event);
    }
    public Optional<EmailOutbox> claim() { return tx.execute(status -> outbox.claim(now(),settings)); }

    /** Refreshes content and verifies the original recipient and current debt immediately before SMTP. */
    public Optional<EmailTemplateService.Template> prepare(EmailOutbox row) {
        return tx.execute(status -> {
            bills.lockBill(row.billId());
            services.lockApartment(services.apartment(row.billId()));
            var data=eligible(row);
            if (data.isEmpty()) {
                outbox.finish(row,"CANCELLED","NO_LONGER_ELIGIBLE",null,now());
                return Optional.empty();
            }
            var bill=data.get();
            var event=row.serviceEventId()==null?null:services.event(row.serviceEventId()).orElseThrow();
            var template=render(bill,row.type(),event);
            return outbox.refreshClaim(row,template,now(),settings.getLeaseSeconds()) ? Optional.of(template) : Optional.empty();
        });
    }
    private Optional<BillingReminderData> eligible(EmailOutbox row) {
        if(!row.type().active())return Optional.empty();
        return bills.load(row.billId()).flatMap(b->row.meterReadingId()==null?Optional.of(b):bills.electricity(b,row.meterReadingId()))
            .filter(b -> b.userId()==row.userId() && b.householdId()==row.householdId() && b.email().equals(row.email()))
            .filter(b -> row.type()==BillingReminderType.BILL_SERVICE_SUSPENDED ? row.serviceEventId()!=null &&
                services.event(row.serviceEventId()).filter(e->e.billId()==row.billId() && suspensionEligible(b,e)).isPresent() : b.eligible(row.type(),today()));
    }
    public void sent(EmailOutbox row) { tx.executeWithoutResult(status -> outbox.finish(row,"SENT",null,null,now())); }
    public void failed(EmailOutbox row, String code, boolean permanent) {
        long delay = Math.min(86400L, settings.getRetryBaseSeconds() * (1L << Math.min(20,Math.max(0,row.attempts()-1))));
        LocalDateTime next = permanent || row.attempts()>=settings.getMaxAttempts() ? null : now().plusSeconds(delay);
        tx.executeWithoutResult(status -> outbox.finish(row,"FAILED",code,next,now()));
    }
    public void retry(long id) {
        tx.executeWithoutResult(status -> {
            var row=outbox.find(id,true).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy lịch sử email"));
            if (!"FAILED".equals(row.status()) || row.attempts()>=settings.getMaxAttempts() || eligible(row).isEmpty())
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Email không còn đủ điều kiện gửi lại hoặc đã hết số lần thử");
            outbox.retry(id,now());
        });
    }
}
