package com.dancu.qlydancu.service;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.dancu.qlydancu.model.Notification;
import com.dancu.qlydancu.model.enums.NotificationType;
import com.dancu.qlydancu.model.enums.RequestType;

/** Shared wording for request notifications. Legacy formatting never changes stored entities. */
public record RequestNotificationContent(String title, String content) {
    private static final Pattern LEGACY_STATUS_TITLE = Pattern.compile(
            "Yêu cầu #\\d+ (đã được tiếp nhận|đã hoàn thành|bị từ chối)");

    private static String category(RequestType type) {
        return (type != null ? type : RequestType.SUPPORT).getDisplayName().toLowerCase(Locale.ROOT);
    }

    public static RequestNotificationContent created(RequestType type, String apartment, String description) {
        String location = apartment != null && !apartment.isBlank() ? " từ căn hộ " + apartment : "";
        return new RequestNotificationContent("Yêu cầu " + category(type) + " mới" + location,
                description != null ? description : "");
    }

    public static RequestNotificationContent processing(RequestType type) {
        return new RequestNotificationContent("Yêu cầu hỗ trợ đã được tiếp nhận",
                "Yêu cầu " + category(type) + " của bạn đã được nhân viên tiếp nhận và đang xử lý.");
    }

    public static RequestNotificationContent done(RequestType type) {
        return new RequestNotificationContent("Yêu cầu hỗ trợ đã hoàn thành",
                "Yêu cầu " + category(type) + " của bạn đã được hoàn thành. Vui lòng kiểm tra kết quả.");
    }

    public static RequestNotificationContent rejected(String reason) {
        return new RequestNotificationContent("Yêu cầu hỗ trợ chưa được chấp thuận",
                "Yêu cầu hỗ trợ của bạn chưa được chấp thuận."
                        + (reason != null && !reason.isBlank() ? " Lý do: " + reason : ""));
    }

    public static RequestNotificationContent forDisplay(Notification notification) {
        if (notification == null) return new RequestNotificationContent("Thông báo hệ thống", "");
        String title = notification.getTitle();
        String content = notification.getContent();
        RequestNotificationContent original = new RequestNotificationContent(title, content);
        // Only recognize exact templates produced by the old request services.
        // Never globally replace enum names, #numbers, or text written by residents/admins.
        if (notification.getType() != NotificationType.GENERAL || notification.getCreatedBy() != null
                || title == null || content == null) return original;

        String newRequestPrefix = "Yêu cầu mới từ căn hộ ";
        if (title.startsWith(newRequestPrefix)) {
            for (RequestType type : RequestType.values()) {
                String prefix = "[" + type.name() + "] ";
                if (content.startsWith(prefix)) {
                    return created(type, title.substring(newRequestPrefix.length()), content.substring(prefix.length()));
                }
            }
        }

        Matcher statusTitle = LEGACY_STATUS_TITLE.matcher(title);
        if (!statusTitle.matches()) return original;
        String status = statusTitle.group(1);
        for (RequestType type : RequestType.values()) {
            if (status.equals("đã được tiếp nhận") && content.equals(
                    "Yêu cầu (" + type.name() + ") của bạn đang được xử lý.")) return processing(type);
            if (status.equals("đã hoàn thành") && content.equals(
                    "Yêu cầu (" + type.name() + ") của bạn đã được xử lý hoàn tất.")) return done(type);
        }
        if (status.equals("đã được tiếp nhận") && content.equals("Yêu cầu () của bạn đang được xử lý.")) {
            return processing(null);
        }
        if (status.equals("đã hoàn thành") && content.equals("Yêu cầu () của bạn đã được xử lý hoàn tất.")) {
            return done(null);
        }
        String rejectedPrefix = "Yêu cầu của bạn đã bị từ chối.";
        if (status.equals("bị từ chối")) {
            if (content.equals(rejectedPrefix)) return rejected(null);
            String reasonPrefix = rejectedPrefix + " Lý do: ";
            if (content.startsWith(reasonPrefix)) return rejected(content.substring(reasonPrefix.length()));
        }
        return original;
    }
}
