package com.dancu.qlydancu.billing;

import java.time.LocalDate;

public enum BillingReminderType {
    BILL_CREATED("CREATED", "Thông báo hóa đơn cần thanh toán", "Hóa đơn đã được phát hành và cần thanh toán."),
    BILL_REMINDER("REMINDER_3_DAYS", "Nhắc thanh toán hóa đơn quá hạn", "Hóa đơn có khoản phí đã quá hạn ít nhất 3 ngày và chưa được thanh toán đầy đủ."),
    BILL_OVERDUE_NOTICE("NOTICE_7_DAYS", "[THÔNG BÁO QUAN TRỌNG] Hóa đơn quá hạn 7 ngày — cảnh báo tạm ngừng điện, nước", "Hóa đơn có khoản phí đã quá hạn ít nhất 7 ngày và chưa được thanh toán đầy đủ. Vui lòng thanh toán sớm và liên hệ Ban quản lý để tránh gián đoạn dịch vụ điện, nước."),
    BILL_SERVICE_SUSPENDED("SERVICE_SUSPENDED", "[THÔNG BÁO QUAN TRỌNG] Dịch vụ tại căn hộ đã được tạm ngừng", "Đã ghi nhận xác nhận tạm ngừng dịch vụ từ đơn vị có thẩm quyền."),
    BILL_PAID("PAID", "Xác nhận thanh toán hóa đơn thành công", "Ban quản lý đã xác nhận hóa đơn được thanh toán đầy đủ."),
    // Retained strictly for reading history. These types must never be created, retried or sent.
    BILL_DUE_MINUS_3, BILL_DUE_MINUS_1, BILL_DUE_TODAY, BILL_OVERDUE_1, BILL_OVERDUE_7;

    public final String keyPart;
    public final String subject;
    public final String message;
    BillingReminderType(String keyPart,String subject,String message) {
        this.keyPart=keyPart;this.subject=subject;this.message=message;
    }
    BillingReminderType() {this.keyPart=null;this.subject="Legacy billing reminder";this.message="Workflow replaced";}
    public boolean active() {return keyPart!=null;}
    public boolean scheduledReminder() {return this==BILL_REMINDER || this==BILL_OVERDUE_NOTICE;}
    public static boolean reminderDue(LocalDate dueDate,LocalDate today) {
        return dueDate!=null && !today.isBefore(dueDate.plusDays(3));
    }
}
