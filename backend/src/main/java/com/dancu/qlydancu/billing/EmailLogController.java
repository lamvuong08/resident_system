package com.dancu.qlydancu.billing;

import java.time.*;
import java.util.Set;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@BillingReminderEnabled
@RequestMapping("/api/admin/email-logs")
public class EmailLogController {
    private final EmailOutboxRepository repository;
    private final EmailOutboxService service;
    public EmailLogController(EmailOutboxRepository repository, EmailOutboxService service) { this.repository=repository; this.service=service; }
    public record LogView(long id, BillingReminderType notificationType, long billId, LocalDate dueDate,
        String recipientEmail, String status, int attempts, int failedAttempts, OffsetDateTime nextRetryAt,
        OffsetDateTime sentAt, OffsetDateTime createdAt, OffsetDateTime updatedAt, String errorCode, OffsetDateTime notificationCreatedAt,Long serviceEventId,Long meterReadingId) {
        static LogView of(EmailOutbox row) {
            int at=row.email().indexOf('@');
            String masked=at>0 ? row.email().substring(0,1)+"***"+row.email().substring(at) : "***";
            return new LogView(row.id(),row.type(),row.billId(),row.dueDate(),masked,row.status(),row.attempts(),row.failedAttempts(),
                utc(row.nextRetryAt()),utc(row.sentAt()),utc(row.createdAt()),utc(row.updatedAt()),row.errorMessage(),utc(row.notificationCreatedAt()),row.serviceEventId(),row.meterReadingId());
        }
        private static OffsetDateTime utc(LocalDateTime value) { return value==null ? null : value.atOffset(ZoneOffset.UTC); }
    }
    @GetMapping
    public Page<LogView> list(@RequestParam(required=false) String status,
            @RequestParam(required=false) BillingReminderType type,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        if (page<0 || page>100000 || size<1 || size>100 || (status!=null && !Set.of("PENDING","SENDING","SENT","FAILED","CANCELLED").contains(status)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Bộ lọc hoặc phân trang không hợp lệ");
        return new PageImpl<>(repository.list(status,type,page*size,size).stream().map(LogView::of).toList(),PageRequest.of(page,size),repository.count(status,type));
    }
    @GetMapping("/{id}")
    public LogView detail(@PathVariable long id) {
        return LogView.of(repository.find(id,false).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy lịch sử email")));
    }
    @PostMapping("/{id}/retry")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void retry(@PathVariable long id) { service.retry(id); }
}
