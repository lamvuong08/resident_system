package com.dancu.qlydancu.billing;

import jakarta.validation.constraints.*;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@ConfigurationProperties("app.billing-reminders")
public class BillingReminderProperties {
    private boolean enabled = false;
    private boolean schedulerEnabled = true;
    private boolean workerEnabled = true;
    private String cron = "0 0 8 * * *";
    private String zone = "Asia/Ho_Chi_Minh";
    @Min(1) @Max(10) private int maxAttempts = 5;
    @Min(60) private int retryBaseSeconds = 60;
    @Min(300) private int leaseSeconds = 300;
    @Min(5) private int minSendIntervalSeconds = 10;
    @Min(1) @Max(500) private int pageSize = 100;
    private String systemName = "Quản lý chung cư";
    private String websiteUrl = "";
    private String supportPhone = "";
    private String supportEmail = "";
    private String officeAddress = "";
    private boolean simulation = false;
}
