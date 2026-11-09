package com.dancu.qlydancu.billing;

import java.lang.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@ConditionalOnProperty(prefix = "app.billing-reminders", name = "enabled", havingValue = "true")
public @interface BillingReminderEnabled {}
