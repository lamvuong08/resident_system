package com.dancu.qlydancu.sepay;

import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/payments/sepay/transactions")
@PreAuthorize("hasRole('ADMIN')")
public class SePayAuditController {
    private final SePayTransactionRepository transactions;
    public SePayAuditController(SePayTransactionRepository transactions) {this.transactions=transactions;}
    @GetMapping
    public Page<SePayTransaction> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return transactions.findAll(PageRequest.of(Math.max(0,page),Math.max(1,Math.min(size,100)),Sort.by("receivedAt").descending()));
    }
}
