package com.dancu.qlydancu.billing;

import java.time.*;

public record EmailOutbox(long id, BillingReminderType type, long billId, LocalDate dueDate, long userId,
        long householdId, String email, String subject, String body, String plainBody, String status,
        int attempts, LocalDateTime nextRetryAt, LocalDateTime sentAt, LocalDateTime createdAt,
        LocalDateTime updatedAt, String errorMessage, String claimToken, LocalDateTime notificationCreatedAt, int failedAttempts, Long serviceEventId,Long meterReadingId) {}
