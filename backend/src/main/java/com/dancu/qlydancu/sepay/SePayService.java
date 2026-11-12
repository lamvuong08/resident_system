package com.dancu.qlydancu.sepay;

import com.dancu.qlydancu.model.*;
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.repo.*;
import com.dancu.qlydancu.service.PaymentService;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class SePayService {
    private static final Pattern CODE=Pattern.compile("(?i)(?<![A-Z0-9])HD([1-9][0-9]*)(?![A-Z0-9])");
    private final SePayProperties settings;
    private final SePayTransactionRepository transactions;
    private final BillRepository bills;
    private final BillDetailRepository details;
    private final PaymentService payments;
    private final UserRepository users;
    private final HouseholdRepository households;

    public SePayService(SePayProperties settings,SePayTransactionRepository transactions,BillRepository bills,
            BillDetailRepository details,PaymentService payments,UserRepository users,HouseholdRepository households) {
        this.settings=settings;this.transactions=transactions;this.bills=bills;this.details=details;
        this.payments=payments;this.users=users;this.households=households;
    }

    @Transactional
    public void receive(SePayPayload payload,byte[] raw) {
        if (payload.id()==null || payload.id()<=0 || payload.gateway()==null || payload.gateway().length()>100
                || payload.accountNumber()==null || payload.accountNumber().length()>100
                || payload.referenceCode()!=null && payload.referenceCode().length()>100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid transaction identity");
        String key="TEST:"+payload.id();
        String reference=payload.referenceCode()==null || payload.referenceCode().isBlank()?null:
            "TEST:"+payload.gateway()+":"+payload.accountNumber()+":"+payload.referenceCode();
        transactions.claim(key,reference,new String(raw,StandardCharsets.UTF_8));
        var audit=transactions.findLocked(key,reference).orElseThrow();
        if (!"RECEIVED".equals(audit.getOutcome())) return;
        audit.setOutcome("REVIEW");
        if (!"in".equals(payload.transferType())) { audit.setOutcome("IGNORED_OUTGOING"); return; }
        if (!settings.getAccountNumber().equals(payload.accountNumber()) || !settings.getBank().equalsIgnoreCase(payload.gateway())) {
            audit.setOutcome("WRONG_ACCOUNT");return;
        }
        Long billId=identifyBill(payload.code(),payload.content());
        if (billId==null) { audit.setOutcome("INVALID_CODE");return; }
        audit.setBillId(billId);
        Bill bill=bills.findLockedById(billId).orElse(null);
        if (bill==null) { audit.setOutcome("BILL_NOT_FOUND");return; }
        if (bill.isDraft()) { audit.setOutcome("DRAFT_BILL");return; }
        if (bill.getStatus()==BillDetailStatus.PAID) { audit.setOutcome("ALREADY_PAID");return; }
        var all=details.findByBill_Id(billId);
        if (all.stream().anyMatch(d->d.getStatus()==BillDetailStatus.PENDING)) {
            audit.setOutcome("MANUAL_PENDING");return;
        }
        var remaining=all.stream().filter(d->d.getStatus()==BillDetailStatus.UNPAID).toList();
        long outstanding=remaining.stream().mapToLong(BillDetail::getAmount).reduce(0L,Math::addExact);
        long amount;
        try {amount=payload.transferAmount().longValueExact();}
        catch (NullPointerException|ArithmeticException ex) {audit.setOutcome("INVALID_AMOUNT");return;}
        if (amount<=0 || outstanding<=0 || amount!=outstanding) {audit.setOutcome("AMOUNT_MISMATCH");return;}
        Payment payment=payments.recordBankPayment(bill,remaining,amount,"SEPAY:TEST:"+payload.id());
        audit.setPaymentId(payment.getId());
        audit.setOutcome("SETTLED");
    }

    static Long identifyBill(String code,String content) {
        Set<Long> found=new HashSet<>();
        try {
            if (code!=null && !code.isBlank()) {
                if (!code.matches("(?i)HD[1-9][0-9]*")) return null;
                found.add(Long.parseLong(code.substring(2)));
            }
            var matcher=CODE.matcher(content==null?"":content);
            while (matcher.find()) found.add(Long.parseLong(matcher.group(1)));
        } catch (NumberFormatException ex) {return null;}
        return found.size()==1?found.iterator().next():null;
    }

    public record QrInfo(Long billId,String apartmentCode,long outstanding,String paymentCode,String bank,
            String accountNumber,String accountName,String qrUrl,boolean testMode,String status) {}

    @Transactional(readOnly=true)
    public QrInfo qr(Long id,String principal) {
        if (!settings.isEnabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Thanh toán QR chưa được cấu hình");
        var user=users.findByUsernameOrEmail(principal,principal).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN));
        var household=households.findByUser_Id(user.getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN));
        var bill=bills.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!bill.getApartment().getId().equals(household.getApartment().getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (bill.isDraft()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Hóa đơn chưa phát hành");
        var all=details.findByBill_Id(id);
        long outstanding=all.stream().filter(d->d.getStatus()!=BillDetailStatus.PAID).mapToLong(BillDetail::getAmount).reduce(0L,Math::addExact);
        String status=bill.getStatus()==BillDetailStatus.PAID?"PAID":all.stream().anyMatch(d->d.getStatus()==BillDetailStatus.PENDING)?"MANUAL_PENDING":"WAITING";
        String code="HD"+id;
        String qrUrl=!"WAITING".equals(status) || outstanding<=0?null:UriComponentsBuilder.fromUriString("https://vietqr.app/img")
            .queryParam("acc",settings.getAccountNumber()).queryParam("bank",settings.getBank())
            .queryParam("amount",outstanding).queryParam("des",code).build().encode().toUriString();
        return new QrInfo(id,bill.getApartment().getCode(),outstanding,code,settings.getBank(),
            settings.getAccountNumber(),settings.getAccountName(),qrUrl,settings.isTestMode(),status);
    }
}
