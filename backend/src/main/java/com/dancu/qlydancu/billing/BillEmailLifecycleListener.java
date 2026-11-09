package com.dancu.qlydancu.billing;

import com.dancu.qlydancu.repo.*;
import com.dancu.qlydancu.model.enums.NotificationType;
import com.dancu.qlydancu.service.NotificationService;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.*;

@Component
public class BillEmailLifecycleListener {
    private final EntityManager entityManager;
    private final ObjectProvider<EmailOutboxService> outbox;
    private final BillRepository bills;
    private final HouseholdRepository households;
    private final NotificationService notifications;
    public BillEmailLifecycleListener(EntityManager entityManager,ObjectProvider<EmailOutboxService> outbox,
            BillRepository bills,HouseholdRepository households,NotificationService notifications) {
        this.entityManager=entityManager;this.outbox=outbox;this.bills=bills;this.households=households;this.notifications=notifications;
    }
    @TransactionalEventListener(phase=TransactionPhase.BEFORE_COMMIT)
    public void onBillEvent(BillEmailEventPublisher.Event event) {
        // Same DB transaction as issuance/payment; no SMTP here. JDBC sees flushed JPA changes.
        entityManager.flush();
        var service=outbox.getIfAvailable();
        if(service!=null) {
            if(event.meterReadingId()!=null)service.enqueueElectricity(event.billId(),event.meterReadingId());
            else service.enqueueLifecycle(event.billId(),event.type());
            return;
        }
        // Keep existing personal website notifications when the email feature is disabled.
        bills.findById(event.billId()).ifPresent(bill -> {
            if(bill.getApartment()==null) return;
            households.findByApartment_Code(bill.getApartment().getCode()).ifPresent(household ->
                notifications.sendNotificationToHousehold(household,event.type().subject,
                    event.type().message+" Hóa đơn #"+bill.getId()+", kỳ "+bill.getBillingMonth()+".",
                    NotificationType.PAYMENT,"/user/payment",event.type().name()));
        });
    }
}
