package com.dancu.qlydancu.repo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.dancu.qlydancu.model.Notification;
import com.dancu.qlydancu.model.enums.NotificationType;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("SELECT n FROM Notification n " +
           "LEFT JOIN FETCH n.createdBy " + 
           "WHERE (:type IS NULL OR n.type = :type) " +
           "ORDER BY n.createdAt DESC")
    Page<Notification> findNotifications(@Param("type") NotificationType type, Pageable pageable);
}