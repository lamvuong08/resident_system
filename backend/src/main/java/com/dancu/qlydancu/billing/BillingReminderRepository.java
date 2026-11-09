package com.dancu.qlydancu.billing;

import java.time.*;
import java.util.*;
import jakarta.mail.internet.InternetAddress;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@BillingReminderEnabled
public class BillingReminderRepository {
    private final JdbcTemplate jdbc;
    public BillingReminderRepository(JdbcTemplate jdbc) {this.jdbc=jdbc;}
    public List<Long> candidates(LocalDate today,long afterId,int limit) {
        return jdbc.queryForList("""
            SELECT b.id FROM bills b WHERE b.id>? AND b.status IN ('UNPAID','PENDING')
              AND b.issued_at IS NOT NULL
              AND EXISTS (SELECT 1 FROM bill_details d WHERE d.bill_id=b.id AND d.amount>0
                AND d.status IN ('UNPAID','PENDING') AND d.due_date<?)
            ORDER BY b.id LIMIT ?
            """,Long.class,afterId,today.minusDays(2).atStartOfDay(),limit);
    }
    public void lockBill(long id) {jdbc.queryForList("SELECT id FROM bills WHERE id=? FOR UPDATE",Long.class,id);}
    public Optional<BillingReminderData> load(long id) {
        var headers=jdbc.query("""
            SELECT b.id,b.billing_month,b.status,b.issued_at,b.payment_confirmed_at,h.id household_id,u.id user_id,u.email,u.name,
                   a.code apartment,bl.name building
            FROM bills b JOIN apartments a ON a.id=b.apartment_id
            JOIN households h ON h.apartment_id=a.id JOIN users u ON u.id=h.user_id
            LEFT JOIN buildings bl ON bl.id=a.building_id
            WHERE b.id=? AND b.status IN ('UNPAID','PENDING','PAID') AND b.issued_at IS NOT NULL
              AND u.roles='ROLE_USER' AND u.status='ACTIVE'
              AND (h.created_at IS NULL OR b.issued_at>=h.created_at)
            """,(r,n)->new Header(r.getLong("id"),r.getLong("household_id"),r.getLong("user_id"),r.getString("email"),
                r.getString("name"),r.getString("apartment"),r.getString("building"),r.getString("billing_month"),
                r.getString("status"),r.getObject("issued_at",LocalDateTime.class),r.getObject("payment_confirmed_at",LocalDateTime.class)),id);
        if(headers.size()!=1||!validEmail(headers.getFirst().email))return Optional.empty();
        var details=jdbc.query("""
            SELECT d.id,d.old_reading,d.new_reading,d.quantity,d.unit_price,d.due_date,d.amount,d.status,ft.name fee_name,ft.code fee_code,
              EXISTS (SELECT 1 FROM payment_details pd JOIN payments p ON p.id=pd.payment_id WHERE pd.bill_detail_id=d.id AND p.status='SUCCESS') paid,
              EXISTS (SELECT 1 FROM payment_details pd JOIN payments p ON p.id=pd.payment_id WHERE pd.bill_detail_id=d.id AND p.status='PENDING') pending
            FROM bill_details d LEFT JOIN fee_types ft ON ft.id=d.fee_type_id WHERE d.bill_id=? ORDER BY d.id
            """,(r,n)->new Detail(r.getObject("due_date",LocalDateTime.class),r.getLong("amount"),r.getString("status"),
                r.getString("fee_name"),r.getBoolean("paid"),r.getBoolean("pending"),r.getString("fee_code"),r.getBigDecimal("old_reading"),
                r.getBigDecimal("new_reading"),r.getBigDecimal("quantity"),r.getObject("unit_price",Long.class),r.getLong("id")),id);
        long total=0,outstanding=0,paid=0;boolean pending=false;
        List<BillingReminderData.FeeLine> fees=new ArrayList<>();
        for(var d:details) {
            if(d.amount<0 || !Set.of("PAID","PENDING","UNPAID").contains(Objects.toString(d.status,"")))return Optional.empty();
            total=Math.addExact(total,d.amount);
            boolean settled=d.paid||"PAID".equals(d.status);
            if(settled)paid=Math.addExact(paid,d.amount);else outstanding=Math.addExact(outstanding,d.amount);
            if(!settled&&(d.pending||"PENDING".equals(d.status)))pending=true;
            fees.add(new BillingReminderData.FeeLine(d.name==null?"Khoản phí":d.name,d.amount,d.due==null?null:d.due.toLocalDate(),settled,d.code,d.old,d.current,d.quantity,d.unitPrice,d.id));
        }
        var payment=jdbc.query("""
            SELECT p.payment_method,p.transaction_code FROM payments p JOIN payment_details pd ON pd.payment_id=p.id
              JOIN bill_details d ON d.id=pd.bill_detail_id WHERE d.bill_id=? AND p.status='SUCCESS'
            ORDER BY p.paid_at DESC,p.id DESC LIMIT 1
            """,(r,n)->new String[]{r.getString(1),r.getString(2)},id);
        var h=headers.getFirst();String[] last=payment.isEmpty()?new String[]{null,null}:payment.getFirst();
        return Optional.of(new BillingReminderData(h.id,h.household,h.user,h.email,h.name,h.apartment,h.building,h.month,
            total,outstanding,paid,h.issued,h.confirmed,h.status,pending,last[0],last[1],List.copyOf(fees)));
    }
    public static boolean validEmail(String email) {
        if(email==null||email.length()>254||email.contains("\r")||email.contains("\n"))return false;
        try {var address=new InternetAddress(email,true);address.validate();return address.getPersonal()==null&&email.equals(address.getAddress())&&email.contains("@");}
        catch(Exception ex){return false;}
    }
    private record Header(long id,long household,long user,String email,String name,String apartment,String building,String month,String status,LocalDateTime issued,LocalDateTime confirmed){}
    public Optional<BillingReminderData> electricity(BillingReminderData bill,long readingId) {
        var linked=jdbc.query("""
            SELECT r.issued_bill_detail_id,r.issued_at FROM meter_readings r JOIN bill_details d ON d.id=r.issued_bill_detail_id
            WHERE r.id=? AND d.bill_id=? AND r.approval_status='ISSUED'
            """,(r,n)->new Object[]{r.getLong(1),r.getObject(2,LocalDateTime.class)},readingId,bill.billId());
        if(linked.size()!=1)return Optional.empty();
        var row=linked.getFirst();var selected=bill.fees().stream().filter(f->java.util.Objects.equals(f.detailId(),row[0])).toList();
        if(selected.size()!=1||row[1]==null)return Optional.empty();
        var fee=selected.getFirst();long paid=fee.paid()?fee.amount():0;
        return Optional.of(new BillingReminderData(bill.billId(),bill.householdId(),bill.userId(),bill.email(),bill.residentName(),
            bill.apartment(),bill.building(),bill.billingMonth(),fee.amount(),fee.amount()-paid,paid,(LocalDateTime)row[1],bill.confirmedAt(),
            fee.paid()?"PAID":"UNPAID",bill.pending(),bill.paymentMethod(),bill.transactionCode(),selected));
    }
    private record Detail(LocalDateTime due,long amount,String status,String name,boolean paid,boolean pending,String code,
        java.math.BigDecimal old,java.math.BigDecimal current,java.math.BigDecimal quantity,Long unitPrice,long id){}
}
