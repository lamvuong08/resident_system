package com.dancu.qlydancu.billing;

import java.time.*;
import java.util.List;

public record BillingReminderData(long billId,long householdId,long userId,String email,String residentName,
        String apartment,String building,String billingMonth,long total,long outstanding,long paidAmount,
        LocalDateTime issuedAt,LocalDateTime confirmedAt,String status,boolean pending,
        String paymentMethod,String transactionCode,List<FeeLine> fees) {
    public record FeeLine(String name,long amount,LocalDate dueDate,boolean paid,String code,java.math.BigDecimal oldReading,
            java.math.BigDecimal newReading,java.math.BigDecimal quantity,Long unitPrice,Long detailId) {
        public FeeLine(String name,long amount,LocalDate dueDate,boolean paid) { this(name,amount,dueDate,paid,null); }
        public FeeLine(String name,long amount,LocalDate dueDate,boolean paid,String code) {this(name,amount,dueDate,paid,code,null,null,null,null,null);}
    }
    public long overdueDays(LocalDate today) {
        return fees.stream().filter(f -> !f.paid() && f.amount()>0 && f.dueDate()!=null)
            .mapToLong(f -> java.time.temporal.ChronoUnit.DAYS.between(f.dueDate(),today)).max().orElse(0);
    }
    public boolean eligible(BillingReminderType type,LocalDate today) {
        if(!type.active() || issuedAt==null || issuedAt.toLocalDate().isAfter(today) || total<=0 || fees.isEmpty()) return false;
        if(type==BillingReminderType.BILL_PAID)
            return "PAID".equals(status) && outstanding==0 && confirmedAt!=null && paidAmount>=total;
        if(!("UNPAID".equals(status)||"PENDING".equals(status)) || outstanding<=0) return false;
        if(type==BillingReminderType.BILL_CREATED) return true;
        return type.scheduledReminder() && !pending && overdueDays(today)>=(type==BillingReminderType.BILL_OVERDUE_NOTICE?7:3);
    }
}
