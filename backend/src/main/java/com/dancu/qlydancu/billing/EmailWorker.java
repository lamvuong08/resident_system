package com.dancu.qlydancu.billing;

import jakarta.mail.SendFailedException;
import jakarta.mail.MessagingException;
import java.util.*;
import java.util.function.Predicate;
import org.slf4j.*;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.dancu.qlydancu.service.EmailService;

@Component
@BillingReminderEnabled
public class EmailWorker {
    private static final Logger log=LoggerFactory.getLogger(EmailWorker.class);
    private final EmailOutboxService outbox;
    private final EmailService mail;
    private final BillingReminderProperties settings;
    public EmailWorker(EmailOutboxService outbox, EmailService mail, BillingReminderProperties settings) { this.outbox=outbox; this.mail=mail; this.settings=settings; }
    @Scheduled(fixedDelayString="${app.billing-reminders.worker-delay-ms:10000}")
    public void tick() { if(settings.isWorkerEnabled()) processOne(); }
    public boolean processOne() {
        var claimed=outbox.claim();
        if (claimed.isEmpty()) return false;
        var row=claimed.get();
        var template=outbox.prepare(row);
        if (template.isEmpty()) return true;
        try {
            mail.sendMultipartMessage(row.email(),template.get().subject(),template.get().text(),template.get().html());
        } catch (RuntimeException ex) {
            boolean authentication=hasCause(ex,MailAuthenticationException.class);
            boolean invalid=hasInvalidRecipient(ex);
            outbox.failed(row,authentication ? "SMTP_AUTHENTICATION_FAILED" : invalid ? "SMTP_RECIPIENT_REJECTED" : "SMTP_DELIVERY_FAILED",authentication||invalid);
            log.warn("Billing email failed outboxId={} attempt={}",row.id(),row.attempts());
            return true;
        }
        // Keep acknowledgement outside the SMTP catch: a DB failure after acceptance is uncertain delivery.
        outbox.sent(row);
        log.info("Billing email sent outboxId={} attempt={}",row.id(),row.attempts());
        return true;
    }
    private static boolean hasCause(Throwable ex,Class<? extends Throwable> type) {
        return matches(ex,type::isInstance);
    }
    private static boolean hasInvalidRecipient(Throwable ex) {
        return matches(ex,error -> error instanceof SendFailedException failed &&
            failed.getInvalidAddresses()!=null && failed.getInvalidAddresses().length>0);
    }
    private static boolean matches(Throwable error,Predicate<Throwable> predicate) {
        var pending=new ArrayDeque<Throwable>();
        var seen=Collections.newSetFromMap(new IdentityHashMap<Throwable,Boolean>());
        pending.add(error);
        while(!pending.isEmpty() && seen.size()<32) {
            var current=pending.removeFirst();
            if(!seen.add(current)) continue;
            if(predicate.test(current)) return true;
            if(current.getCause()!=null) pending.add(current.getCause());
            if(current instanceof MailSendException send) Collections.addAll(pending,send.getMessageExceptions());
            if(current instanceof MessagingException message && message.getNextException()!=null) pending.add(message.getNextException());
        }
        return false;
    }
}
