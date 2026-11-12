package com.dancu.qlydancu.sepay;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties("app.sepay")
public class SePayProperties {
    private boolean enabled;
    private boolean testMode = true;
    private String webhookSecret = "";
    private String bank = "";
    private String accountNumber = "";
    private String accountName = "";
    private String frontendUrl = "http://localhost:5173";
}
