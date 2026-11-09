package com.dancu.qlydancu.billing;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(BillingReminderProperties.class)
public class BillingReminderConfiguration {
    @Bean("billingReminderClock")
    public Clock billingReminderClock(BillingReminderProperties properties) {
        return Clock.system(ZoneId.of(properties.getZone()));
    }
}
