package com.dancu.qlydancu.sepay;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/payments/sepay")
public class SePayController {
    private final SePayAuthenticator authenticator;
    private final SePayService service;
    private final ObjectMapper mapper;
    public SePayController(SePayAuthenticator authenticator,SePayService service,ObjectMapper mapper) {
        this.authenticator=authenticator;this.service=service;
        this.mapper=mapper.copy().disable(com.fasterxml.jackson.databind.DeserializationFeature.ACCEPT_FLOAT_AS_INT);
    }
    @PostMapping(value="/webhook",consumes="application/json")
    public Map<String,Boolean> webhook(@RequestBody byte[] raw,
            @RequestHeader(value="X-SePay-Timestamp",required=false) String timestamp,
            @RequestHeader(value="X-SePay-Signature",required=false) String signature) {
        if (raw.length>65536) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        authenticator.verify(raw,timestamp,signature);
        SePayPayload payload;
        try {payload=mapper.readValue(raw,SePayPayload.class);}
        catch (java.io.IOException ex) {throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid SePay JSON");}
        if (payload==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        service.receive(payload,raw);
        return Map.of("success",true);
    }
    @GetMapping("/bills/{id}/qr")
    @PreAuthorize("hasRole('USER')")
    public SePayService.QrInfo qr(@PathVariable Long id,Principal principal) {return service.qr(id,principal.getName());}
}
