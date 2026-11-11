package com.dancu.qlydancu.service;

import com.dancu.qlydancu.repo.UserRepository;
import com.dancu.qlydancu.model.enums.NotificationType;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.*;
import org.springframework.transaction.annotation.*;

@Component
public class MeterDecisionNotification {
    public record Event(String staff,String apartment,String period,String service,String reason) {}
    private final UserRepository users;
    private final NotificationService notifications;
    public MeterDecisionNotification(UserRepository users,NotificationService notifications) {this.users=users;this.notifications=notifications;}
    @Transactional(propagation=Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
    public void rejected(Event e) {
        // This notification is independent from the committed meter decision.
        try {
            users.findByUsernameOrEmail(e.staff(),e.staff()).ifPresent(user -> notifications.sendNotificationToUser(user,
                "Yêu cầu kiểm tra lại chỉ số "+e.service(),"Căn hộ "+e.apartment()+", kỳ "+e.period()+": "+e.reason(),
                NotificationType.GENERAL,"/staff/meter-readings","METER_REJECTED"));
        } catch(RuntimeException error) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("Cannot deliver meter rejection notification after commit");
        }
    }
}
