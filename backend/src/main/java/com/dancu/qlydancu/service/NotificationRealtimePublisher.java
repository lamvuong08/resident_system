package com.dancu.qlydancu.service;

import com.dancu.qlydancu.dto.NotificationRealtimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Collection;

@Service
public class NotificationRealtimePublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationRealtimePublisher.class);
    private static final String USER_DESTINATION = "/queue/notifications";

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationRealtimePublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Gửi thông báo realtime tới một người dùng sau khi transaction commit thành công.
     */
    public void sendAfterCommit(Long userId, NotificationRealtimeMessage message) {
        if (userId == null || message == null) {
            return;
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendDirect(userId, message);
                }
            });
        } else {
            sendDirect(userId, message);
        }
    }

    /**
     * Gửi thông báo realtime tới danh sách người dùng sau khi transaction commit thành công.
     */
    public void sendAfterCommit(Collection<Long> userIds, NotificationRealtimeMessage message) {
        if (userIds == null || userIds.isEmpty() || message == null) {
            return;
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    for (Long uid : userIds) {
                        sendDirect(uid, message);
                    }
                }
            });
        } else {
            for (Long uid : userIds) {
                sendDirect(uid, message);
            }
        }
    }

    /**
     * Gửi trực tiếp qua SimpMessagingTemplate, bắt mọi ngoại lệ để không ảnh hưởng dữ liệu.
     */
    private void sendDirect(Long userId, NotificationRealtimeMessage message) {
        try {
            messagingTemplate.convertAndSendToUser(userId.toString(), USER_DESTINATION, message);
            log.info("Sent realtime notification to userId={}, notiId={}, title='{}'",
                    userId, message.id(), message.title());
        } catch (Exception ex) {
            log.error("Failed to send realtime notification to userId={}: {}", userId, ex.getMessage());
        }
    }
}
