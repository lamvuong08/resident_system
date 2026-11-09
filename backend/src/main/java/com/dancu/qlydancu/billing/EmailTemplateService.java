package com.dancu.qlydancu.billing;

import java.net.URI;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
@BillingReminderEnabled
public class EmailTemplateService {
    private final BillingReminderProperties properties;
    public EmailTemplateService(BillingReminderProperties properties) { this.properties = properties; }
    public record Template(String subject, String html, String text) {}

    public Template render(BillingReminderData bill, BillingReminderType type) {
        return render(bill,type,LocalDate.now(ZoneId.of(properties.getZone())),Set.of(),null);
    }
    public Template render(BillingReminderData bill,BillingReminderType type,LocalDate today,
            Set<UtilityServiceType> suspended,ServiceSuspensionRepository.Event event) {
        if(!type.active())throw new IllegalArgumentException("Legacy billing templates are disabled");
        boolean suspension=type==BillingReminderType.BILL_SERVICE_SUSPENDED;
        if(suspension && (event==null||suspended.isEmpty()))throw new IllegalArgumentException("Confirmed suspension required");
        String subject = "[" + properties.getSystemName().replaceAll("[\\r\\n]", " ") + "] " + type.subject;
        if(type==BillingReminderType.BILL_CREATED && bill.fees().size()==1 && "ELECTRIC".equals(bill.fees().getFirst().code()))
            subject="[THÔNG BÁO HÓA ĐƠN] Hóa đơn tiền điện tháng "+bill.billingMonth();
        if(suspension)subject="[THÔNG BÁO QUAN TRỌNG] Dịch vụ "+serviceLabels(suspended)+" tại căn hộ đã được tạm ngừng";
        if(suspension && event.simulated())subject="[MÔ PHỎNG] "+subject;
        StringBuilder content=new StringBuilder();
        content.append("Kính gửi ").append(value(bill.residentName())).append(",\n\n").append(type.message).append("\n");
        if(type.scheduledReminder())content.append("Số ngày quá hạn của khoản phí chưa thanh toán lâu nhất: ")
            .append(Math.max(0,bill.overdueDays(today))).append(" ngày. Vui lòng sớm hoàn thành khoản thanh toán còn thiếu.\n");
        if(type==BillingReminderType.BILL_OVERDUE_NOTICE)content.append("Đây là thông báo nhắc nợ và cảnh báo tạm ngừng dịch vụ; không phải xác nhận điện, nước đã bị tạm ngừng.\n");
        if(suspension) {
            if(event.simulated())content.append("MÔ PHỎNG TRONG MÔI TRƯỜNG DEV — không xác nhận dịch vụ thực tế.\n");
            content.append("Hóa đơn có khoản phí dịch vụ đã quá hạn ít nhất 7 ngày và chưa được thanh toán đầy đủ.\n")
                .append("Theo xác nhận từ ").append(event.authority()).append(", dịch vụ ").append(serviceLabels(suspended))
                .append(" tại căn hộ đã được tạm ngừng.\n")
                .append("Thời điểm xác nhận: ").append(date(event.confirmedAt())).append(" (giờ Việt Nam).\n");
        }
        content.append("Tòa nhà: ").append(value(bill.building())).append(" · Căn hộ: ").append(value(bill.apartment())).append("\n");
        content.append("Hóa đơn: #").append(bill.billId()).append(" · Kỳ thanh toán: ").append(value(bill.billingMonth())).append("\n");
        content.append("Ngày phát hành: ").append(date(bill.issuedAt())).append("\n\nCác khoản phí:\n");
        for(var fee:bill.fees())content.append("- ").append(value(fee.name())).append(": ").append(money(fee.amount()))
            .append(" · Hạn thanh toán: ").append(fee.dueDate()==null?"Chưa quy định":fee.dueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n");
        content.append("\nTổng số tiền hóa đơn: ").append(money(bill.total())).append("\n");
        for(var fee:bill.fees()) {
            if("ELECTRIC".equals(fee.code())&&fee.oldReading()!=null&&fee.newReading()!=null) {
                content.append("Chỉ số điện cũ: ").append(number(fee.oldReading())).append(" kWh\n")
                    .append("Chỉ số điện mới: ").append(number(fee.newReading())).append(" kWh\n")
                    .append("Điện năng tiêu thụ: ").append(number(fee.newReading().subtract(fee.oldReading()))).append(" kWh\n");
            }
        }
        content.append("Số tiền đã thanh toán: ").append(money(bill.paidAmount())).append("\n");
        content.append("Số tiền còn phải thanh toán: ").append(money(bill.outstanding())).append("\n");
        if(type==BillingReminderType.BILL_PAID) {
            content.append("Thời gian xác nhận thanh toán: ").append(date(bill.confirmedAt())).append(" (giờ Việt Nam)\n");
            if(bill.paymentMethod()!=null)content.append("Phương thức thanh toán: ").append(method(bill.paymentMethod())).append("\n");
            if(bill.transactionCode()!=null&&!bill.transactionCode().isBlank())content.append("Mã giao dịch: ").append(bill.transactionCode()).append("\n");
            content.append("Trạng thái: Đã thanh toán\n\nĐây là bản xác nhận thanh toán điện tử từ ").append(properties.getSystemName()).append(".\n");
            if(!suspended.isEmpty()) {
                content.append("Dịch vụ ").append(serviceLabels(suspended)).append(" vẫn đang được ghi nhận tạm ngừng. Thanh toán thành công chưa phải xác nhận khôi phục dịch vụ.\n");
                appendSupport(content);
            }
        } else {
            content.append("Trạng thái: ").append(bill.paidAmount()>0?"Đã thanh toán một phần":"Chưa thanh toán đầy đủ").append("\n");
            content.append("\nVui lòng đăng nhập website để xem hóa đơn và làm theo hướng dẫn thanh toán.\n");
            content.append("Khoản đang chờ xác nhận không cần thanh toán lại. Vui lòng kiểm tra trạng thái mới nhất trước khi thanh toán.\n");
        }
        if(suspension)appendSupport(content);
        content.append("\nĐơn vị quản lý: ").append(properties.getSystemName()).append(".\n");
        String text=content.toString();
        String link = paymentUrl();
        String html = """
            <!doctype html><html lang="vi"><head><meta charset="UTF-8"></head>
            <body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#1f2937">
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px">
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px">
            <tr><td style="padding:24px;background:#1557d6;color:#ffffff;font-size:20px;font-weight:bold">%s</td></tr>
            <tr><td style="padding:24px;font-size:15px;line-height:1.7">%s%s%s</td></tr>
            <tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px">Email hóa đơn tự động từ hệ thống quản lý chung cư.</td></tr>
            </table></td></tr></table></body></html>
            """.formatted(escape(properties.getSystemName()),
                suspension?"<div style=\"padding:16px;margin-bottom:20px;border:1px solid #dc2626;background:#fef2f2;color:#991b1b;font-weight:bold\">"+
                    (event.simulated()?"MÔ PHỎNG — ":"")+"ĐÃ TẠM NGỪNG: "+escape(serviceLabels(suspended))+"</div>":"",
                escape(text).replace("\n", "<br>"),
                link.isEmpty() ? "" : "<p><a href=\"" + escape(link) + "\" style=\"display:inline-block;padding:12px 20px;background:#1557d6;color:#ffffff;text-decoration:none;border-radius:6px\">Xem hóa đơn trên website</a></p>");
        return new Template(subject, html, text + (link.isEmpty() ? "" : "\nXem hóa đơn: " + link));
    }

    public static String serviceLabels(Set<UtilityServiceType> services) {
        return services.stream().sorted().map(s->s.label).collect(java.util.stream.Collectors.joining(" và "));
    }
    private void appendSupport(StringBuilder content) {
        content.append("\nHƯỚNG DẪN KHÔI PHỤC DỊCH VỤ\n")
            .append("Vui lòng liên hệ Ban quản lý hoặc đơn vị cung cấp dịch vụ để giải quyết công nợ và được hướng dẫn thủ tục khôi phục.\n")
            .append("Ban Quản lý chung cư: ").append(properties.getSystemName()).append("\n");
        appendIfPresent(content,"Số điện thoại hỗ trợ: ",properties.getSupportPhone());
        appendIfPresent(content,"Email hỗ trợ: ",properties.getSupportEmail());
        appendIfPresent(content,"Văn phòng Ban Quản lý: ",properties.getOfficeAddress());
        content.append("Việc khôi phục dịch vụ sẽ được xử lý theo quy trình của đơn vị có thẩm quyền, sau khi có xác nhận thực tế.\n");
    }
    private static void appendIfPresent(StringBuilder text,String label,String value) {
        if(value!=null&&!value.isBlank())text.append(label).append(value.trim()).append("\n");
    }

    /** Public HTTPS deployment URL only; omit the button when configuration is unsuitable. */
    public String paymentUrl() {
        try {
            URI uri = URI.create(properties.getWebsiteUrl());
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || !host.contains(".") ||
                host.equalsIgnoreCase("localhost") || host.endsWith(".localhost") || host.endsWith(".local") ||
                host.endsWith(".test") || host.matches("[0-9.]+") || host.contains(":") ||
                uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) return "";
            return properties.getWebsiteUrl().replaceAll("/+$", "") + "/user/payment";
        } catch (IllegalArgumentException ex) { return ""; }
    }
    private static String date(java.time.LocalDateTime date) { return date==null?"Chưa có thông tin":date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")); }
    private static String method(String code) { return switch(code) { case "CASH" -> "Tiền mặt"; case "BANK_TRANSFER" -> "Chuyển khoản"; default -> code; }; }
    private static String value(String text) { return text == null || text.isBlank() ? "Chưa có thông tin" : text; }
    private static String escape(String text) { return HtmlUtils.htmlEscape(text, "UTF-8"); }
    private static String money(long amount) { return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + " VNĐ"; }
    private static String number(java.math.BigDecimal amount) {return NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN")).format(amount);}
}
