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
        if(type!=BillingReminderType.BILL_SERVICE_SUSPENDED)return renderInvoice(bill,type,today,suspended);
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
            if(("ELECTRIC".equals(fee.code()) || "WATER".equals(fee.code())) && fee.oldReading()!=null && fee.newReading()!=null) {
                String label = "WATER".equals(fee.code()) ? "nước" : "điện";
                String unit = "WATER".equals(fee.code()) ? " m³" : " kWh";
                content.append("Chỉ số ").append(label).append(" cũ: ").append(number(fee.oldReading())).append(unit).append("\n")
                    .append("Chỉ số ").append(label).append(" mới: ").append(number(fee.newReading())).append(unit).append("\n")
                    .append("Tiêu thụ: ").append(number(fee.newReading().subtract(fee.oldReading()))).append(unit).append("\n");
                if(fee.note()!=null)content.append("Chi tiết biểu giá: ").append(fee.note()).append("\n");
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
    /** Four invoice events share one email-safe layout; no price or lifecycle calculation here. */
    private Template renderInvoice(BillingReminderData bill,BillingReminderType type,LocalDate today,Set<UtilityServiceType> suspended) {
        boolean paid=type==BillingReminderType.BILL_PAID;
        boolean reminder=type.scheduledReminder();
        String title=switch(type) {
            case BILL_CREATED -> "Hóa đơn mới cần thanh toán";
            case BILL_REMINDER -> "Nhắc thanh toán hóa đơn quá hạn";
            case BILL_OVERDUE_NOTICE -> "Cảnh báo công nợ quá hạn";
            case BILL_PAID -> "Thanh toán thành công";
            default -> throw new IllegalArgumentException("Unsupported invoice event");
        };
        String color=switch(type) {case BILL_REMINDER -> "#b45309";case BILL_OVERDUE_NOTICE -> "#b42318";case BILL_PAID -> "#15803d";default -> "#1557d6";};
        String background=switch(type) {case BILL_REMINDER -> "#fff7ed";case BILL_OVERDUE_NOTICE -> "#fef2f2";case BILL_PAID -> "#f0fdf4";default -> "#eff6ff";};
        String description=paid ? "Ban quản lý xác nhận hóa đơn đã được thanh toán đầy đủ."
            : reminder ? "Hệ thống ghi nhận hóa đơn vẫn còn khoản phí chưa thanh toán. Vui lòng kiểm tra và đối chiếu công nợ."
            : "Ban quản lý đã phát hành hóa đơn phí chung cư. Vui lòng đăng nhập để kiểm tra trước khi thanh toán.";
        String cta=switch(type) {case BILL_CREATED -> "Xem hóa đơn";case BILL_REMINDER -> "Xem và thanh toán";case BILL_OVERDUE_NOTICE -> "Kiểm tra công nợ";default -> "Xem chi tiết hóa đơn";};
        String amountLabel=paid?"Đã thanh toán":reminder?"Còn phải thanh toán":"Tổng tiền cần thanh toán";
        long amount=paid?bill.paidAmount():bill.outstanding();
        var dueDates=bill.fees().stream().filter(f->paid||!f.paid()).map(BillingReminderData.FeeLine::dueDate)
            .filter(java.util.Objects::nonNull).distinct().sorted().toList();
        String deadline=dueDates.isEmpty()?"Chưa quy định":dueDates.stream().map(d->d.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
            .collect(java.util.stream.Collectors.joining(", "));
        String dueLabel=dueDates.size()>1?"Các hạn thanh toán theo khoản phí":"Hạn thanh toán";
        StringBuilder text=new StringBuilder(title).append("\n\nKính gửi ").append(value(bill.residentName())).append(",\n")
            .append(description).append("\n");
        StringBuilder body=new StringBuilder("<p style=\"margin:0 0 12px;\">Kính gửi ").append(escape(value(bill.residentName()))).append(",</p>")
            .append("<p style=\"margin:0 0 20px;\">").append(escape(description)).append("</p>");
        String highlight=tableStart()+"<tr><td style=\"padding:20px;background:"+background+";border:1px solid "+color+";border-radius:8px;\">"
            +"<p style=\"margin:0;font-size:12px;font-weight:bold;color:"+color+";\">"+escape(amountLabel)+"</p>"
            +"<p style=\"margin:8px 0;font-size:30px;line-height:1.3;font-weight:bold;color:#172b4d;\">"+money(amount)+"</p>"
            +"<p style=\"margin:0;color:#475569;font-size:14px;\">"+escape(paid?"Thời gian xác nhận: "+date(bill.confirmedAt())+" (giờ Việt Nam)":dueLabel+": "+deadline)+"</p>"
            +(reminder?"<p style=\"margin:8px 0 0;color:"+color+";font-weight:bold;\">Quá hạn "+Math.max(0,bill.overdueDays(today))+" ngày (khoản chưa thanh toán lâu nhất)</p>":"")
            +"</td></tr></table>";
        body.append(highlight);
        text.append(amountLabel).append(": ").append(money(amount)).append("\n");
        StringBuilder rows=new StringBuilder();
        addRow(rows,text,"Mã hóa đơn","#"+bill.billId());addRow(rows,text,"Tòa nhà",value(bill.building()));
        addRow(rows,text,"Căn hộ",value(bill.apartment()));addRow(rows,text,"Kỳ thanh toán",value(bill.billingMonth()));
        addRow(rows,text,"Ngày phát hành",date(bill.issuedAt()));addRow(rows,text,dueLabel,deadline);
        if(reminder)addRow(rows,text,"Số ngày quá hạn",Math.max(0,bill.overdueDays(today))+" ngày (khoản chưa thanh toán lâu nhất)");
        addRow(rows,text,"Tổng tiền hóa đơn",money(bill.total()));addRow(rows,text,"Đã thanh toán",money(bill.paidAmount()));
        addRow(rows,text,"Còn phải thanh toán",money(bill.outstanding()));
        if(paid) {
            addRow(rows,text,"Thời gian xác nhận",date(bill.confirmedAt())+" (giờ Việt Nam)");
            if(bill.paymentMethod()!=null&&!bill.paymentMethod().isBlank())addRow(rows,text,"Phương thức thanh toán gần nhất",method(bill.paymentMethod()));
            if(bill.transactionCode()!=null&&!bill.transactionCode().isBlank())addRow(rows,text,"Mã giao dịch gần nhất",bill.transactionCode());
            addRow(rows,text,"Trạng thái","Đã thanh toán");
        }
        body.append("<h2 style=\"font-size:16px;margin:24px 0 12px;\">Thông tin ").append(paid?"thanh toán":"hóa đơn").append("</h2>")
            .append(tableStart()).append(rows).append("</table>");
        if(!paid) {
            body.append("<h2 style=\"font-size:16px;margin:24px 0 12px;\">").append(reminder?"Các khoản chưa thanh toán":"Chi tiết khoản phí").append("</h2>")
                .append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;table-layout:fixed;border-collapse:collapse;\"><thead><tr>")
                .append("<th scope=\"col\" align=\"left\" style=\"width:64%;padding:12px 8px;background:#f1f5f9;\">Khoản phí</th>")
                .append("<th scope=\"col\" align=\"right\" style=\"padding:12px 8px;background:#f1f5f9;\">Thành tiền</th></tr></thead><tbody>");
            text.append("\n").append(reminder?"Các khoản chưa thanh toán:":"Chi tiết khoản phí:").append("\n");
            for(var fee:bill.fees())if(!reminder||!fee.paid()) {
                String label=value(fee.name());
                if(("ELECTRIC".equals(fee.code())||"WATER".equals(fee.code()))&&fee.quantity()!=null&&fee.oldReading()!=null&&fee.newReading()!=null)
                    label+=" ("+number(fee.quantity())+("WATER".equals(fee.code())?" m³":" kWh")+")";
                body.append("<tr><td style=\"padding:12px 8px;border-bottom:1px solid #e2e8f0;word-wrap:break-word;overflow-wrap:anywhere;\">").append(escape(label));
                if(dueDates.size()>1)body.append("<br><span style=\"font-size:12px;color:#64748b;\">Hạn: ").append(fee.dueDate()==null?"Chưa quy định":fee.dueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("</span>");
                body.append("</td><td align=\"right\" style=\"padding:12px 8px;border-bottom:1px solid #e2e8f0;word-wrap:break-word;\">").append(money(fee.amount())).append("</td></tr>");
                text.append("- ").append(label).append(": ").append(money(fee.amount()));
                if(dueDates.size()>1)text.append(" · Hạn: ").append(fee.dueDate()==null?"Chưa quy định":fee.dueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                text.append("\n");
            }
            body.append("</tbody></table>");
        }
        String guidance=paid ? ("CASH".equals(bill.paymentMethod())?"Ban quản lý đã ghi nhận và xác nhận khoản thanh toán tiền mặt của quý cư dân.":"Cảm ơn quý cư dân đã hoàn tất thanh toán. Vui lòng đăng nhập hệ thống để xem chi tiết hóa đơn.")
            : type==BillingReminderType.BILL_OVERDUE_NOTICE?"Đề nghị quý cư dân sớm hoàn tất thanh toán hoặc liên hệ Ban quản lý để được hỗ trợ và đối chiếu công nợ."
            : "Vui lòng kiểm tra và hoàn tất các khoản phí còn lại. Nếu đã thanh toán nhưng hệ thống chưa cập nhật, vui lòng liên hệ Ban quản lý để được hỗ trợ.";
        body.append("<p style=\"margin:20px 0;\">").append(escape(guidance)).append("</p>");text.append("\n").append(guidance).append("\n");
        if(paid&&!suspended.isEmpty()) {
            var notice=new StringBuilder("Dịch vụ ").append(serviceLabels(suspended)).append(" vẫn đang được ghi nhận tạm ngừng. Thanh toán thành công chưa phải xác nhận khôi phục dịch vụ.\n");
            appendSupport(notice);
            body.append("<p style=\"color:#475569;font-size:13px;\">").append(escape(notice.toString()).replace("\n","<br>")).append("</p>");
            text.append(notice);
        }
        if(!paid) {
            String pending="Khoản đang chờ xác nhận không cần thanh toán lại. Vui lòng đăng nhập để kiểm tra trạng thái mới nhất trước khi thanh toán.";
            body.append("<p style=\"font-size:13px;color:#475569;\">").append(pending).append("</p>");text.append(pending).append("\n");
        }
        String link=paymentUrl();
        if(!link.isEmpty()) {
            body.append(tableStart()).append("<tr><td align=\"center\" style=\"padding:12px 0 8px;\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\"><tr><td bgcolor=\"").append(color)
                .append("\" style=\"border-radius:6px;\"><a href=\"").append(escape(link)).append("\" style=\"display:inline-block;padding:14px 22px;border:1px solid ").append(color)
                .append(";color:#ffffff;text-decoration:none;font-weight:bold;font-family:Arial,Helvetica,sans-serif;\">").append(escape(cta)).append("</a></td></tr></table></td></tr></table>");
            text.append(cta).append(": ").append(link).append("\n");
        }
        String support="Nếu thông tin chưa chính xác, vui lòng liên hệ Ban quản lý để được đối chiếu.";
        String contacts=support+(blank(properties.getSupportPhone())?"":"\nĐiện thoại: "+properties.getSupportPhone().trim())
            +(blank(properties.getSupportEmail())?"":"\nEmail: "+properties.getSupportEmail().trim())
            +(blank(properties.getOfficeAddress())?"":"\nVăn phòng: "+properties.getOfficeAddress().trim());
        String footer="Đơn vị quản lý: "+value(properties.getSystemName())+".\nEmail tự động từ hệ thống quản lý chung cư.\n"+contacts
            +"\nBan quản lý không yêu cầu cung cấp mật khẩu hoặc OTP qua email.";
        text.append("\n").append(footer);
        String html="""
            <!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>%s</title></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:14px;line-height:1.6;-webkit-text-size-adjust:100%%;">
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px 8px;">
            <!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="width:100%%;max-width:600px;table-layout:fixed;background:#ffffff;border:1px solid #e2e8f0;">
            <tr><td style="padding:16px 20px;border-bottom:3px solid %s;font-weight:bold;color:#334155;word-wrap:break-word;overflow-wrap:anywhere;">%s</td></tr>
            <tr><td style="padding:24px 20px;word-wrap:break-word;overflow-wrap:anywhere;"><h1 style="font-size:23px;line-height:1.35;margin:0 0 20px;color:%s;">%s</h1>%s</td></tr>
            <tr><td style="padding:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;word-wrap:break-word;overflow-wrap:anywhere;">%s</td></tr>
            </table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>
            """.formatted(escape(title),color,escape(value(properties.getSystemName())),color,escape(title),body,escape(footer).replace("\n","<br>"));
        String subject="["+value(properties.getSystemName()).replaceAll("[\\r\\n]"," ")+"] "+title+" · Kỳ "+value(bill.billingMonth()).replaceAll("[\\r\\n]"," ");
        return new Template(subject,html,text.toString());
    }
    private static String tableStart() {return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;table-layout:fixed;border-collapse:collapse;\">";}
    private static boolean blank(String value) {return value==null||value.isBlank();}
    private static void addRow(StringBuilder html,StringBuilder text,String label,String value) {
        html.append("<tr><td style=\"width:44%;padding:7px 0;color:#64748b;vertical-align:top;\">").append(escape(label))
            .append("</td><td style=\"padding:7px 0 7px 12px;color:#334155;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere;\">").append(escape(value)).append("</td></tr>");
        text.append(label).append(": ").append(value).append("\n");
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
            if(blank(properties.getWebsiteUrl()))return "";
            URI uri = URI.create(properties.getWebsiteUrl());
            String host = uri.getHost()==null?null:uri.getHost().toLowerCase(Locale.ROOT);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || !host.contains(".") ||
                host.equalsIgnoreCase("localhost") || host.endsWith(".localhost") || host.endsWith(".local") ||
                host.endsWith(".test") || host.matches("[0-9.]+") || host.contains(":") ||
                uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null ||
                uri.getRawPath()!=null&&!uri.getRawPath().isEmpty()&&!uri.getRawPath().equals("/")) return "";
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
