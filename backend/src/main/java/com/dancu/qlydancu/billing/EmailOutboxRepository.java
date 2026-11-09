package com.dancu.qlydancu.billing;

import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

@Repository
@BillingReminderEnabled
public class EmailOutboxRepository {
    private final JdbcTemplate jdbc;
    public EmailOutboxRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static LocalDateTime date(ResultSet rs, String name) throws SQLException {
        return rs.getObject(name, LocalDateTime.class);
    }
    private static final RowMapper<EmailOutbox> MAPPER = (r,n) -> new EmailOutbox(r.getLong("id"),
        BillingReminderType.valueOf(r.getString("notification_type")), r.getLong("reference_id"),
        r.getObject("due_date", LocalDate.class), r.getLong("user_id"), r.getLong("household_id"),
        r.getString("recipient_email"), r.getString("subject"), r.getString("body"), r.getString("plain_body"),
        r.getString("status"), r.getInt("attempts"), date(r,"next_retry_at"), date(r,"sent_at"),
        date(r,"created_at"), date(r,"updated_at"), r.getString("error_message"), r.getString("claim_token"), date(r,"notification_created_at"),r.getInt("failed_attempts"),r.getObject("service_event_id",Long.class),r.getObject("meter_reading_id",Long.class));

    public static String key(BillingReminderData bill, BillingReminderType type) {
        if(!type.active())throw new IllegalArgumentException("Legacy billing workflow is disabled");
        if(type==BillingReminderType.BILL_SERVICE_SUSPENDED)throw new IllegalArgumentException("Use suspension event key");
        return "BILL:" + bill.billId() + ":" + type.keyPart + ":USER:" + bill.userId();
    }
    public boolean exists(String key) {
        return !jdbc.queryForList("SELECT id FROM email_outbox WHERE idempotency_key=?", Long.class, key).isEmpty();
    }
    public void insert(BillingReminderData bill, BillingReminderType type,
                       EmailTemplateService.Template template, LocalDateTime now) {
        insert(bill,type,template,now,null);
    }
    public static String suspensionKey(long eventId) { return "SERVICE_EVENT:"+eventId+":SUSPENDED"; }
    public void insert(BillingReminderData bill,BillingReminderType type,
                       EmailTemplateService.Template template,LocalDateTime now,Long eventId) {
        insert(bill,type,template,now,eventId,null);
    }
    public static String electricityKey(long readingId,long userId) {return "METER_READING:"+readingId+":ISSUED:USER:"+userId;}
    public void insert(BillingReminderData bill,BillingReminderType type,
                       EmailTemplateService.Template template,LocalDateTime now,Long eventId,Long readingId) {
        if((type==BillingReminderType.BILL_SERVICE_SUSPENDED)!=(eventId!=null))throw new IllegalArgumentException("Suspension requires an event");
        jdbc.update("""
            INSERT INTO email_outbox (notification_type,reference_type,reference_id,due_date,user_id,household_id,
              recipient_email,subject,body,plain_body,status,attempts,next_retry_at,created_at,updated_at,idempotency_key,service_event_id,meter_reading_id)
            VALUES (?,'BILL',?,?,?,?,?,?,?,?,'PENDING',0,?,?,?,?,?,?)
            """, type.name(), bill.billId(), null, bill.userId(), bill.householdId(), bill.email(),
            template.subject(), template.html(), template.text(), now, now, now,
            readingId!=null?electricityKey(readingId,bill.userId()):eventId==null?key(bill,type):suspensionKey(eventId),eventId,readingId);
    }
    public boolean rearmReminder(String key,EmailTemplateService.Template template,LocalDateTime now,int maxAttempts) {
        return jdbc.update("""
            UPDATE email_outbox SET status='PENDING',error_message=NULL,next_retry_at=?,updated_at=?,subject=?,body=?,plain_body=?
            WHERE idempotency_key=? AND notification_type IN ('BILL_REMINDER','BILL_OVERDUE_NOTICE') AND status='CANCELLED' AND attempts<?
              AND error_message IN ('DUE_DATE_RULE_CHANGED','NO_LONGER_ELIGIBLE')
            """,now,now,template.subject(),template.html(),template.text(),key,maxAttempts)==1;
    }
    public void notificationCreated(String key, LocalDateTime now) {
        jdbc.update("UPDATE email_outbox SET notification_created_at=? WHERE idempotency_key=?", now, key);
    }
    public Optional<EmailOutbox> find(long id, boolean lock) {
        return jdbc.query("SELECT * FROM email_outbox WHERE id=?" + (lock ? " FOR UPDATE" : ""), MAPPER, id).stream().findFirst();
    }

    /** Must run in a short transaction. Rate gate and SKIP LOCKED coordinate all instances. */
    public Optional<EmailOutbox> claim(LocalDateTime now, BillingReminderProperties settings) {
        cancelLegacy(now);
        var gate = jdbc.query("SELECT next_send_at FROM email_worker_gate WHERE id=1 FOR UPDATE SKIP LOCKED",
            (rs,n) -> rs.getObject(1, LocalDateTime.class));
        if (gate.isEmpty() || gate.getFirst().isAfter(now)) return Optional.empty();
        jdbc.update("""
            UPDATE email_outbox SET status=CASE WHEN attempts>=? THEN 'FAILED' ELSE 'PENDING' END,
              failed_attempts=failed_attempts+1,error_message='LEASE_EXPIRED_DELIVERY_UNKNOWN',claim_token=NULL,locked_until=NULL,next_retry_at=?,updated_at=?
            WHERE status='SENDING' AND locked_until<=?
            """, settings.getMaxAttempts(), now, now, now);
        var rows = jdbc.query("""
            SELECT * FROM email_outbox WHERE status IN ('PENDING','FAILED') AND attempts<?
              AND notification_type IN ('BILL_CREATED','BILL_REMINDER','BILL_OVERDUE_NOTICE','BILL_SERVICE_SUSPENDED','BILL_PAID')
              AND next_retry_at IS NOT NULL AND next_retry_at<=?
            ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
            """, MAPPER, settings.getMaxAttempts(), now);
        if (rows.isEmpty()) return Optional.empty();
        var row = rows.getFirst();
        String token = UUID.randomUUID().toString();
        jdbc.update("""
            UPDATE email_outbox SET status='SENDING',attempts=attempts+1,claim_token=?,locked_until=?,updated_at=? WHERE id=?
            """, token, now.plusSeconds(settings.getLeaseSeconds()), now, row.id());
        jdbc.update("UPDATE email_worker_gate SET next_send_at=? WHERE id=1", now.plusSeconds(settings.getMinSendIntervalSeconds()));
        return find(row.id(), false);
    }
    public boolean refreshClaim(EmailOutbox row, EmailTemplateService.Template template, LocalDateTime now, int leaseSeconds) {
        return jdbc.update("""
            UPDATE email_outbox SET subject=?,body=?,plain_body=?,locked_until=?,updated_at=?
            WHERE id=? AND status='SENDING' AND claim_token=? AND locked_until>?
            """, template.subject(), template.html(), template.text(), now.plusSeconds(leaseSeconds), now,
            row.id(), row.claimToken(), now) == 1;
    }
    public void finish(EmailOutbox row, String status, String error, LocalDateTime retry, LocalDateTime now) {
        jdbc.update("""
            UPDATE email_outbox SET status=?,error_message=?,next_retry_at=?,sent_at=?,updated_at=?,claim_token=NULL,locked_until=NULL
              ,failed_attempts=failed_attempts+?
            WHERE id=? AND status='SENDING' AND claim_token=?
            """, status, error, retry, "SENT".equals(status) ? now : null, now, "FAILED".equals(status) ? 1 : 0,row.id(), row.claimToken());
    }
    public void retry(long id, LocalDateTime now) {
        jdbc.update("UPDATE email_outbox SET status='PENDING',next_retry_at=?,error_message=NULL,updated_at=? WHERE id=? AND status='FAILED'", now, now, id);
    }
    public void cancelLegacy(LocalDateTime now) {
        jdbc.update("""
            UPDATE email_outbox SET status='CANCELLED',error_message='WORKFLOW_REPLACED',next_retry_at=NULL,
              claim_token=NULL,locked_until=NULL,updated_at=?
            WHERE notification_type IN ('BILL_DUE_MINUS_3','BILL_DUE_MINUS_1','BILL_DUE_TODAY','BILL_OVERDUE_1','BILL_OVERDUE_7')
              AND status IN ('PENDING','FAILED','SENDING')
            """,now);
    }
    public void cancelDebtEmails(long billId,LocalDateTime now) {
        jdbc.update("""
            UPDATE email_outbox SET status='CANCELLED',error_message='BILL_PAID',next_retry_at=NULL,
              claim_token=NULL,locked_until=NULL,updated_at=? WHERE reference_id=?
              AND notification_type IN ('BILL_CREATED','BILL_REMINDER','BILL_OVERDUE_NOTICE','BILL_SERVICE_SUSPENDED') AND status IN ('PENDING','FAILED','SENDING')
            """,now,billId);
    }
    public List<EmailOutbox> list(String status, BillingReminderType type, int offset, int limit) {
        return jdbc.query("SELECT * FROM email_outbox WHERE (? IS NULL OR status=?) AND (? IS NULL OR notification_type=?) ORDER BY id DESC LIMIT ? OFFSET ?",
            MAPPER, status, status, type == null ? null : type.name(), type == null ? null : type.name(), limit, offset);
    }
    public long count(String status, BillingReminderType type) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM email_outbox WHERE (? IS NULL OR status=?) AND (? IS NULL OR notification_type=?)", Long.class,
            status, status, type == null ? null : type.name(), type == null ? null : type.name());
    }
}
