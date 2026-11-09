package com.dancu.qlydancu.billing;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("dev & !prod & !production")
@BillingReminderEnabled
@RequestMapping("/api/dev/billing-reminders")
public class BillingReminderDevController {
    private final BillingReminderService service;
    public BillingReminderDevController(BillingReminderService service) { this.service=service; }
    @PostMapping("/run")
    public BillingReminderService.RunResult run() { return service.run(); }
}
