package com.dancu.qlydancu.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.dancu.qlydancu.dto.ResidentNotificationDetailResponse;
import com.dancu.qlydancu.dto.ResidentNotificationListItemResponse;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.Notification;
import com.dancu.qlydancu.model.NotificationReceiver;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.NotificationReceiverRepository;

@Service
public class NotificationService {

    private final HouseholdRepository householdRepository;
    private final NotificationReceiverRepository notificationReceiverRepository;

    public NotificationService(
            HouseholdRepository householdRepository,
            NotificationReceiverRepository notificationReceiverRepository) {
        this.householdRepository = householdRepository;
        this.notificationReceiverRepository = notificationReceiverRepository;
    }

    @Transactional(readOnly = true)
    public List<ResidentNotificationListItemResponse> getResidentNotifications(String email) {
        Household household = requireHouseholdForEmail(email);
        return notificationReceiverRepository.findByHouseholdIdWithNotification(household.getId())
                .stream()
                .map(this::toListItemResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResidentNotificationDetailResponse getResidentNotificationDetail(Long receiverId, String email) {
        Household household = requireHouseholdForEmail(email);
        NotificationReceiver receiver = notificationReceiverRepository
                .findDetailByIdAndHouseholdId(receiverId, household.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo."));
        return toDetailResponse(receiver);
    }

    @Transactional
    public void markNotificationAsRead(Long receiverId, String email) {
        Household household = requireHouseholdForEmail(email);
        NotificationReceiver receiver = notificationReceiverRepository
                .findDetailByIdAndHouseholdId(receiverId, household.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo."));

        if (!Boolean.TRUE.equals(receiver.getIsRead())) {
            receiver.setIsRead(true);
            notificationReceiverRepository.save(receiver);
        }
    }

    @Transactional
    public void markAllNotificationsAsRead(String email) {
        Household household = requireHouseholdForEmail(email);
        List<NotificationReceiver> receivers = notificationReceiverRepository.findByHouseholdIdWithNotification(household.getId());
        for (NotificationReceiver receiver : receivers) {
            if (!Boolean.TRUE.equals(receiver.getIsRead())) {
                receiver.setIsRead(true);
            }
        }
        notificationReceiverRepository.saveAll(receivers);
    }

    private Household requireHouseholdForEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return householdRepository.findByUser_Email(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hộ khẩu."));
    }

    private ResidentNotificationListItemResponse toListItemResponse(NotificationReceiver receiver) {
        Notification notification = receiver.getNotification();
        return new ResidentNotificationListItemResponse(
                receiver.getId(),
                notification != null ? notification.getTitle() : "Thông báo hệ thống",
                notification != null ? notification.getContent() : "",
                notification != null && notification.getType() != null ? notification.getType().name() : "GENERAL",
                Boolean.TRUE.equals(receiver.getIsRead()),
                notification != null ? notification.getCreatedAt() : null);
    }

    private ResidentNotificationDetailResponse toDetailResponse(NotificationReceiver receiver) {
        Notification notification = receiver.getNotification();
        return new ResidentNotificationDetailResponse(
                receiver.getId(),
                notification != null ? notification.getTitle() : "Thông báo hệ thống",
                notification != null ? notification.getContent() : "",
                notification != null && notification.getType() != null ? notification.getType().name() : "GENERAL",
                Boolean.TRUE.equals(receiver.getIsRead()),
                notification != null && notification.getCreatedBy() != null
                        ? notification.getCreatedBy().getUsername()
                        : "Hệ thống",
                notification != null ? notification.getCreatedAt() : null,
                List.of());
    }
}
