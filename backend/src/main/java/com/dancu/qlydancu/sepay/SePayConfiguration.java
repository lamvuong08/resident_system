package com.dancu.qlydancu.sepay;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class SePayConfiguration {
    private final SePayProperties properties;
    public SePayConfiguration(SePayProperties properties) {this.properties=properties;}
    @PostConstruct
    void validate() {
        if (!properties.isEnabled()) {
            org.slf4j.LoggerFactory.getLogger(SePayConfiguration.class).warn(
                "SePay QR is disabled. Configure SEPAY_ENABLED and credentials in backend-local.properties or environment variables.");
            return;
        }
        if (!properties.isTestMode())
            throw new IllegalStateException("This integration requires explicit SePay Test Mode; Live is not enabled");
        var missing=new java.util.ArrayList<String>();
        if (properties.getWebhookSecret().isBlank()) missing.add("SEPAY_WEBHOOK_SECRET");
        if (properties.getBank().isBlank()) missing.add("SEPAY_BANK");
        if (properties.getAccountNumber().isBlank()) missing.add("SEPAY_ACCOUNT_NUMBER");
        if (properties.getAccountName().isBlank()) missing.add("SEPAY_ACCOUNT_NAME");
        if (!missing.isEmpty()) throw new IllegalStateException("Missing SePay environment variables: "+String.join(", ",missing));
        if (!properties.getBank().matches("[A-Za-z][A-Za-z0-9]*"))
            throw new IllegalStateException("SEPAY_BANK must be the SePay gateway/VietQR short name, e.g. MBBank, without spaces or quotes");
        if (!properties.getAccountNumber().equals(properties.getAccountNumber().strip())
                || properties.getAccountNumber().contains("'") || properties.getAccountNumber().contains("\""))
            throw new IllegalStateException("SEPAY_ACCOUNT_NUMBER must not contain surrounding whitespace or quotes");
    }
}
