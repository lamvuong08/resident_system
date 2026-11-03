package com.dancu.qlydancu.repo;

import com.dancu.qlydancu.model.NotificationReceiver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationReceiverRepository extends JpaRepository<NotificationReceiver, Long> {
    List<NotificationReceiver> findByHousehold_Id(Long householdId);

    @Query("""
            SELECT nr
            FROM NotificationReceiver nr
            JOIN FETCH nr.notification n
            LEFT JOIN FETCH n.createdBy
            WHERE nr.household.id = :householdId
            ORDER BY n.createdAt DESC
            """)
    List<NotificationReceiver> findByHouseholdIdWithNotification(@Param("householdId") Long householdId);

    @Query("""
            SELECT nr
            FROM NotificationReceiver nr
            JOIN FETCH nr.notification n
            LEFT JOIN FETCH n.createdBy
            WHERE nr.id = :receiverId AND nr.household.id = :householdId
            """)
    Optional<NotificationReceiver> findDetailByIdAndHouseholdId(
            @Param("receiverId") Long receiverId,
            @Param("householdId") Long householdId);

    @Query("""
            SELECT nr
            FROM NotificationReceiver nr
            JOIN FETCH nr.notification n
            LEFT JOIN FETCH n.createdBy
            WHERE (nr.user.id = :userId OR (:householdId IS NOT NULL AND nr.household.id = :householdId))
            ORDER BY n.createdAt DESC
            """)
    List<NotificationReceiver> findByUserOrHousehold(@Param("userId") Long userId, @Param("householdId") Long householdId);

    @Query("""
            SELECT nr
            FROM NotificationReceiver nr
            JOIN FETCH nr.notification n
            LEFT JOIN FETCH n.createdBy
            WHERE nr.id = :receiverId AND (nr.user.id = :userId OR (:householdId IS NOT NULL AND nr.household.id = :householdId))
            """)
    Optional<NotificationReceiver> findDetailByIdAndUserOrHousehold(
            @Param("receiverId") Long receiverId,
            @Param("userId") Long userId,
            @Param("householdId") Long householdId);

    @Query("""
            SELECT COUNT(nr)
            FROM NotificationReceiver nr
            WHERE (nr.isRead = false OR nr.isRead IS NULL)
              AND (nr.user.id = :userId OR (:householdId IS NOT NULL AND nr.household.id = :householdId))
            """)
    long countUnreadByUserOrHousehold(@Param("userId") Long userId, @Param("householdId") Long householdId);
}