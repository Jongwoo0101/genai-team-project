package com.worksight.api.entity;

import com.worksight.api.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 알림 엔티티
 * - IMPORTANT 타입: 상사가 직접 디렉팅, 수신자가 WORKING/MEETING 상태일 때만 발송
 * - GENERAL 타입: 상태 무관 발송
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 발신자 (MANAGER) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private Member sender;

    /** 수신자 (EMPLOYEE) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private Member receiver;

    /** 알림 내용 */
    @Column(nullable = false)
    private String message;

    /** 알림 종류 */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType notificationType;

    /** 읽음 여부 */
    @Column(nullable = false)
    private boolean read;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime readAt;

    @Builder
    public Notification(Member sender, Member receiver,
                         String message, NotificationType notificationType) {
        this.sender = sender;
        this.receiver = receiver;
        this.message = message;
        this.notificationType = notificationType;
        this.read = false;
    }

    public void markAsRead() {
        this.read = true;
        this.readAt = LocalDateTime.now();
    }
}
