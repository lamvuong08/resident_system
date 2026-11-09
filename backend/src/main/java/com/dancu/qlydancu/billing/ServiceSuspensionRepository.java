package com.dancu.qlydancu.billing;

import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
@BillingReminderEnabled
public class ServiceSuspensionRepository {
    private final JdbcTemplate jdbc;
    public ServiceSuspensionRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public record State(long apartmentId,UtilityServiceType service,UtilityServiceStatus status,Long billId,Long eventId) {}
    public record Event(long id,String requestId,long billId,long apartmentId,long householdId,long userId,
        String action,Set<UtilityServiceType> services,String authority,String evidenceRef,String basisRef,
        LocalDateTime confirmedAt,String recordedBy,LocalDateTime recordedAt,boolean simulated) {}
    public long apartment(long billId) {
        return jdbc.queryForObject("SELECT apartment_id FROM bills WHERE id=?",Long.class,billId);
    }
    public void lockApartment(long apartmentId) {
        jdbc.queryForList("SELECT id FROM apartments WHERE id=? FOR UPDATE",Long.class,apartmentId);
    }
    public Optional<LocalDateTime> issuedAt(long billId) {
        return jdbc.query("SELECT issued_at FROM bills WHERE id=?",(r,n)->r.getObject(1,LocalDateTime.class),billId)
            .stream().filter(Objects::nonNull).findFirst();
    }
    public List<State> states(long apartmentId) {
        var stored=jdbc.query("SELECT * FROM apartment_utility_services WHERE apartment_id=?",(r,n)->new State(
            r.getLong("apartment_id"),UtilityServiceType.valueOf(r.getString("service_type")),
            UtilityServiceStatus.valueOf(r.getString("status")),r.getObject("source_bill_id",Long.class),r.getObject("latest_event_id",Long.class)),apartmentId);
        return Arrays.stream(UtilityServiceType.values()).map(type -> stored.stream().filter(s->s.service()==type).findFirst()
            .orElse(new State(apartmentId,type,UtilityServiceStatus.ACTIVE,null,null))).toList();
    }
    public Set<UtilityServiceType> overdueServices(long billId,LocalDate today) {
        return new HashSet<>(jdbc.queryForList("""
            SELECT DISTINCT ft.code FROM bill_details d JOIN fee_types ft ON ft.id=d.fee_type_id
            JOIN bills b ON b.id=d.bill_id
            WHERE d.bill_id=? AND b.issued_at IS NOT NULL AND b.issued_at<? AND b.status IN ('UNPAID','PENDING')
              AND ft.code IN ('ELECTRIC','WATER') AND d.amount>0 AND d.status='UNPAID' AND d.due_date<?
              AND NOT EXISTS (SELECT 1 FROM bill_details x WHERE x.bill_id=b.id AND x.status='PENDING')
              AND NOT EXISTS (SELECT 1 FROM payment_details pd JOIN payments p ON p.id=pd.payment_id
                  JOIN bill_details x ON x.id=pd.bill_detail_id WHERE x.bill_id=b.id AND p.status='PENDING')
              AND NOT EXISTS (SELECT 1 FROM payment_details pd JOIN payments p ON p.id=pd.payment_id
                  WHERE pd.bill_detail_id=d.id AND p.status='SUCCESS')
            """,String.class,billId,today.plusDays(1).atStartOfDay(),today.minusDays(6).atStartOfDay())
            .stream().map(UtilityServiceType::valueOf).toList());
    }
    public void saveState(long apartmentId,UtilityServiceType type,UtilityServiceStatus status,long billId,Long eventId,LocalDateTime now) {
        jdbc.update("""
            INSERT INTO apartment_utility_services(apartment_id,service_type,status,source_bill_id,latest_event_id,updated_at)
            VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),source_bill_id=VALUES(source_bill_id),
                latest_event_id=VALUES(latest_event_id),updated_at=VALUES(updated_at)
            """,apartmentId,type.name(),status.name(),billId,eventId,now);
    }
    public void clearPaidPending(long billId,LocalDateTime now) {
        jdbc.update("UPDATE apartment_utility_services SET status='ACTIVE',updated_at=? WHERE source_bill_id=? AND status='PENDING_SUSPENSION'",now,billId);
    }
    public List<Map<String,Object>> pending(int offset,int limit) {
        return jdbc.queryForList("SELECT * FROM apartment_utility_services WHERE status='PENDING_SUSPENSION' ORDER BY apartment_id,service_type LIMIT ? OFFSET ?",limit,offset);
    }
    public Optional<Event> event(long id) { return events("id",id).stream().findFirst(); }
    public Optional<Event> byRequest(String request) { return events("request_id",request).stream().findFirst(); }
    private List<Event> events(String column,Object value) {
        // Column names are private constants, never caller input.
        return jdbc.query("SELECT * FROM billing_service_events WHERE "+column+"=?",(r,n)->new Event(r.getLong("id"),r.getString("request_id"),
            r.getLong("bill_id"),r.getLong("apartment_id"),r.getLong("household_id"),r.getLong("user_id"),r.getString("action"),
            decode(r.getString("services")),r.getString("authority"),r.getString("evidence_ref"),r.getString("basis_ref"),
            r.getObject("confirmed_at",LocalDateTime.class),r.getString("recorded_by"),r.getObject("recorded_at",LocalDateTime.class),r.getBoolean("simulated")),value);
    }
    public long insert(String requestId,long billId,long apartmentId,String action,Set<UtilityServiceType> services,
            String authority,String evidence,String basis,LocalDateTime confirmed,String actor,LocalDateTime now,boolean simulated) {
        var recipient=jdbc.queryForMap("SELECT id,user_id FROM households WHERE apartment_id=?",apartmentId);
        var key=new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement=connection.prepareStatement("""
                INSERT INTO billing_service_events(request_id,bill_id,apartment_id,household_id,user_id,action,services,
                    authority,evidence_ref,basis_ref,confirmed_at,recorded_by,recorded_at,simulated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,java.sql.Statement.RETURN_GENERATED_KEYS);
            Object[] values={requestId,billId,apartmentId,recipient.get("id"),recipient.get("user_id"),action,encode(services),authority,evidence,basis,confirmed,actor,now,simulated};
            for(int i=0;i<values.length;i++)statement.setObject(i+1,values[i]);
            return statement;
        },key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    public Set<UtilityServiceType> suspendedForEvent(Event event) {
        var result=EnumSet.noneOf(UtilityServiceType.class);
        for(var state:states(event.apartmentId()))
            if(state.status()==UtilityServiceStatus.SUSPENDED && Objects.equals(state.eventId(),event.id()) && event.services().contains(state.service()))result.add(state.service());
        return result;
    }
    public Set<UtilityServiceType> suspendedAtBillApartment(long billId) {
        var result=EnumSet.noneOf(UtilityServiceType.class);
        for(var state:states(apartment(billId)))if(state.status()==UtilityServiceStatus.SUSPENDED)result.add(state.service());
        return result;
    }
    public List<Long> unqueuedEvents(long billId) {
        return jdbc.queryForList("""
            SELECT e.id FROM billing_service_events e WHERE e.bill_id=? AND e.action='SUSPEND'
              AND NOT EXISTS (SELECT 1 FROM email_outbox o WHERE o.service_event_id=e.id)
            ORDER BY e.id
            """,Long.class,billId);
    }
    public static String encode(Set<UtilityServiceType> types) { return types.stream().sorted().map(Enum::name).collect(java.util.stream.Collectors.joining(",")); }
    private static Set<UtilityServiceType> decode(String types) {
        var result=EnumSet.noneOf(UtilityServiceType.class);
        for(String type:types.split(","))result.add(UtilityServiceType.valueOf(type));
        return Collections.unmodifiableSet(result);
    }
}
