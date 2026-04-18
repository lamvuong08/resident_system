package com.dancu.qlydancu.model;

import jakarta.persistence.*;

@Entity
@Table(name = "notification_receivers")
public class NotificationReceiver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notification_id")
    private Notification notification;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id")
    private Household household;

    @Column(name = "is_read")
    private Boolean isRead;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Notification getNotification() { return notification; }
    public void setNotification(Notification notification) { this.notification = notification; }
    public Household getHousehold() { return household; }
    public void setHousehold(Household household) { this.household = household; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean read) { isRead = read; }
}