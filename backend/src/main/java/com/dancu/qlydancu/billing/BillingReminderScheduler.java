package com.dancu.qlydancu.billing;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@BillingReminderEnabled
public class BillingReminderScheduler {
    private final BillingReminderService service;
    private final BillingReminderProperties settings;
    public BillingReminderScheduler(BillingReminderService service, BillingReminderProperties settings) { this.service=service; this.settings=settings; }
    @Scheduled(cron="${app.billing-reminders.cron:0 0 8 * * *}",zone="${app.billing-reminders.zone:Asia/Ho_Chi_Minh}")
    public void scheduledRun() { if(settings.isSchedulerEnabled()) service.run(); }
    @EventListener(ApplicationReadyEvent.class)
    public void reconcileOnStartup() { scheduledRun(); }
}
