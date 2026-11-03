package com.dancu.qlydancu.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.dancu.qlydancu.dto.NotificationRealtimeMessage;
import com.dancu.qlydancu.dto.ResidentNotificationDetailResponse;
import com.dancu.qlydancu.dto.ResidentNotificationListItemResponse;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.Notification;
import com.dancu.qlydancu.model.NotificationReceiver;
import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.NotificationType;
import com.dancu.qlydancu.model.enums.UserRole;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.NotificationReceiverRepository;
import com.dancu.qlydancu.repo.NotificationRepository;
import com.dancu.qlydancu.repo.UserRepository;

@Service
public class NotificationService {

    private final HouseholdRepository householdRepository;
    private final NotificationReceiverRepository notificationReceiverRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationRealtimePublisher realtimePublisher;

    public NotificationService(
            HouseholdRepository householdRepository,
            NotificationReceiverRepository notificationReceiverRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            NotificationRealtimePublisher realtimePublisher) {
        this.householdRepository = householdRepository;
        this.notificationReceiverRepository = notificationReceiverRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.realtimePublisher = realtimePublisher;
    }

    @Transactional(readOnly = true)
    public List<ResidentNotificationListItemResponse> getResidentNotifications(String email) {
        User user = requireUserForEmail(email);
        Household household = householdRepository.findByUser_Email(email).orElse(null);
        Long householdId = household != null ? household.getId() : null;

        return notificationReceiverRepository.findByUserOrHousehold(user.getId(), householdId)
                .stream()
                .map(this::toListItemResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResidentNotificationDetailResponse getResidentNotificationDetail(Long receiverId, String email) {
        User user = requireUserForEmail(email);
        Household household = householdRepository.findByUser_Email(email).orElse(null);
        Long householdId = household != null ? household.getId() : null;

        NotificationReceiver receiver = notificationReceiverRepository
                .findDetailByIdAndUserOrHousehold(receiverId, user.getId(), householdId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo."));
        return toDetailResponse(receiver);
    }

    @Transactional
    public void markNotificationAsRead(Long receiverId, String email) {
        User user = requireUserForEmail(email);
        Household household = householdRepository.findByUser_Email(email).orElse(null);
        Long householdId = household != null ? household.getId() : null;

        NotificationReceiver receiver = notificationReceiverRepository
                .findDetailByIdAndUserOrHousehold(receiverId, user.getId(), householdId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo."));

        if (!Boolean.TRUE.equals(receiver.getIsRead())) {
            receiver.setIsRead(true);
            notificationReceiverRepository.save(receiver);
        }
    }

    @Transactional
    public void markAllNotificationsAsRead(String email) {
        User user = requireUserForEmail(email);
        Household household = householdRepository.findByUser_Email(email).orElse(null);
        Long householdId = household != null ? household.getId() : null;

        List<NotificationReceiver> receivers = notificationReceiverRepository.findByUserOrHousehold(user.getId(), householdId);
        for (NotificationReceiver receiver : receivers) {
            if (!Boolean.TRUE.equals(receiver.getIsRead())) {
                receiver.setIsRead(true);
            }
        }
        notificationReceiverRepository.saveAll(receivers);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String email) {
        User user = requireUserForEmail(email);
        Household household = householdRepository.findByUser_Email(email).orElse(null);
        Long householdId = household != null ? household.getId() : null;
        return notificationReceiverRepository.countUnreadByUserOrHousehold(user.getId(), householdId);
    }

    @Transactional
    public void sendNotificationToUser(User recipient, String title, String content, NotificationType type, String actionUrl, String eventType) {
        if (recipient == null) return;

        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setContent(content);
        notification.setType(type != null ? type : NotificationType.GENERAL);
        notification.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        Notification saved = notificationRepository.save(notification);

        NotificationReceiver receiver = new NotificationReceiver();
        receiver.setNotification(saved);
        receiver.setUser(recipient);
        receiver.setIsRead(false);
        householdRepository.findByUser_Id(recipient.getId()).ifPresent(receiver::setHousehold);
        NotificationReceiver savedReceiver = notificationReceiverRepository.save(receiver);

        NotificationRealtimeMessage msg = new NotificationRealtimeMessage(
                saved.getId(),
                savedReceiver.getId(),
                saved.getTitle(),
                saved.getContent(),
                saved.getType().name(),
                false,
                saved.getCreatedAt(),
                actionUrl,
                eventType != null ? eventType : "NEW_NOTIFICATION"
        );
        realtimePublisher.sendAfterCommit(recipient.getId(), msg);
    }

    @Transactional
    public void sendNotificationToHousehold(Household household, String title, String content, NotificationType type, String actionUrl, String eventType) {
        if (household == null || household.getUser() == null) return;
        sendNotificationToUser(household.getUser(), title, content, type, actionUrl, eventType);
    }

    @Transactional
    public void sendNotificationToRole(UserRole role, String title, String content, NotificationType type, String actionUrl, String eventType) {
        List<User> users = userRepository.findByRoles(role);
        for (User u : users) {
            sendNotificationToUser(u, title, content, type, actionUrl, eventType);
        }
    }

    private User requireUserForEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng: " + email));
    }

    private ResidentNotificationListItemResponse toListItemResponse(NotificationReceiver receiver) {
        Notification notification = receiver.getNotification();
        RequestNotificationContent wording = RequestNotificationContent.forDisplay(notification);
        return new ResidentNotificationListItemResponse(
                receiver.getId(),
                wording.title(),
                wording.content(),
                notification != null && notification.getType() != null ? notification.getType().name() : "GENERAL",
                Boolean.TRUE.equals(receiver.getIsRead()),
                notification != null ? notification.getCreatedAt() : null);
    }

    private ResidentNotificationDetailResponse toDetailResponse(NotificationReceiver receiver) {
        Notification notification = receiver.getNotification();
        RequestNotificationContent wording = RequestNotificationContent.forDisplay(notification);
        return new ResidentNotificationDetailResponse(
                receiver.getId(),
                wording.title(),
                wording.content(),
                notification != null && notification.getType() != null ? notification.getType().name() : "GENERAL",
                Boolean.TRUE.equals(receiver.getIsRead()),
                notification != null && notification.getCreatedBy() != null
                        ? notification.getCreatedBy().getUsername()
                        : "Hệ thống",
                notification != null ? notification.getCreatedAt() : null,
                List.of());
    }
}
