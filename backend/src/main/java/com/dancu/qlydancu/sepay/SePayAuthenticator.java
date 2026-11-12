package com.dancu.qlydancu.sepay;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SePayAuthenticator {
    private final SePayProperties properties;
    private final Clock clock;
    @org.springframework.beans.factory.annotation.Autowired
    public SePayAuthenticator(SePayProperties properties) { this(properties, Clock.systemUTC()); }
    SePayAuthenticator(SePayProperties properties, Clock clock) { this.properties=properties; this.clock=clock; }

    public void verify(byte[] body, String timestamp, String signature) {
        if (!properties.isEnabled() || properties.getWebhookSecret().isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SePay is not configured");
        try {
            if (timestamp == null || !timestamp.matches("[0-9]{1,12}") || signature == null
                    || !signature.matches("sha256=[0-9a-f]{64}")) throw new IllegalArgumentException();
            long seconds = Long.parseLong(timestamp);
            if (Math.abs(clock.instant().getEpochSecond()-seconds)>300) throw new IllegalArgumentException();
            Mac mac=Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.getWebhookSecret().getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            mac.update((timestamp+".").getBytes(StandardCharsets.UTF_8));
            byte[] expected=mac.doFinal(body);
            if (!MessageDigest.isEqual(expected, HexFormat.of().parseHex(signature.substring(7))))
                throw new IllegalArgumentException();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid SePay signature or timestamp");
        }
    }
}
