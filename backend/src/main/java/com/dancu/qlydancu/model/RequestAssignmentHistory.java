package com.dancu.qlydancu.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import com.dancu.qlydancu.model.enums.AssignmentAction;

@Entity
@Table(name = "request_assignment_history", indexes = @Index(name = "idx_assignment_history_request", columnList = "request_id,id"))
public class RequestAssignmentHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "request_id", nullable = false)
    private UserRequest request;
    @ManyToOne @JoinColumn(name = "previous_staff_id")
    private User previousStaff;
    @ManyToOne(optional = false) @JoinColumn(name = "new_staff_id", nullable = false)
    private User newStaff;
    @ManyToOne(optional = false) @JoinColumn(name = "actor_id", nullable = false)
    private User actor;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private AssignmentAction action;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(length = 2000)
    private String reason;

    protected RequestAssignmentHistory() {}
    public RequestAssignmentHistory(UserRequest request, User previousStaff, User newStaff, User actor,
                                    AssignmentAction action, LocalDateTime createdAt, String reason) {
        this.request = request; this.previousStaff = previousStaff; this.newStaff = newStaff;
        this.actor = actor; this.action = action; this.createdAt = createdAt; this.reason = reason;
    }
    public Long getId() { return id; }
    public User getPreviousStaff() { return previousStaff; }
    public User getNewStaff() { return newStaff; }
    public User getActor() { return actor; }
    public AssignmentAction getAction() { return action; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getReason() { return reason; }
}
