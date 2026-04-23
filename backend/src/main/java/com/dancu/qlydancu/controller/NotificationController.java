package com.dancu.qlydancu.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dancu.qlydancu.dto.NotificationResponse;
import com.dancu.qlydancu.dto.NotificationUpdateRequest;
import com.dancu.qlydancu.model.Notification;
import com.dancu.qlydancu.model.enums.NotificationType;
import com.dancu.qlydancu.repo.NotificationRepository;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @RequestParam(required = false) NotificationType type,
            Pageable pageable) {

        // 1. Lấy Page<Entity> từ DB
        Page<Notification> notifications = notificationRepository.findNotifications(type, pageable);

        // 2. Map sang Page<DTO> bằng tính năng map() của Spring Data Page
        Page<NotificationResponse> response = notifications.map(n -> new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getContent(),
                n.getType() != null ? n.getType().name() : "GENERAL",
                n.getCreatedBy() != null ? n.getCreatedBy().getUsername() : "Hệ thống",
                n.getCreatedAt()));

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationResponse> updateNotification(
            @PathVariable Long id,
            @RequestBody NotificationUpdateRequest request) {

        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông báo có ID: " + id));

        // Cập nhật các trường dữ liệu
        notification.setTitle(request.title());
        notification.setContent(request.content());
        notification.setType(request.type());
        // notification.setCreatedAt(LocalDateTime.now()); // Mở nếu muốn reset thời
        // gian khi sửa

        Notification updated = notificationRepository.save(notification);

        return ResponseEntity.ok(new NotificationResponse(
                updated.getId(),
                updated.getTitle(),
                updated.getContent(),
                updated.getType().name(),
                updated.getCreatedBy() != null ? updated.getCreatedBy().getUsername() : "Hệ thống",
                updated.getCreatedAt()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        if (!notificationRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        notificationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}