package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
}