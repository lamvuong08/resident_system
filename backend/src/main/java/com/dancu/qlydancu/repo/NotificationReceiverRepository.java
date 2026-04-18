package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.NotificationReceiver;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationReceiverRepository extends JpaRepository<NotificationReceiver, Long> {
    List<NotificationReceiver> findByHousehold_Id(Long householdId);
}