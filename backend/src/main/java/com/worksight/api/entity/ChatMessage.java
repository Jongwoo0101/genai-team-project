package com.worksight.api.entity;

import com.worksight.api.enums.ChatMessageType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 채팅 메시지 엔티티
 *
 * messageType:
 *   NORMAL  — 일반 메시지. 수신자가 MEETING/AWAY 상태이면 알림 미발송.
 *   URGENT  — 긴급 알림 메시지. 수신자 상태 무관하게 강제 알림 발송.
 */
@Entity
@Table(name = "chat_message",
       indexes = @Index(name = "idx_chat_message_room_id", columnList = "chat_room_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private Member sender;

    @Column(nullable = false, length = 2000)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatMessageType messageType;    // NORMAL | URGENT

    /** 수신자 읽음 여부 */
    @Column(nullable = false)
    private boolean read;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime readAt;

    @Builder
    public ChatMessage(ChatRoom chatRoom, Member sender,
                       String content, ChatMessageType messageType) {
        this.chatRoom = chatRoom;
        this.sender = sender;
        this.content = content;
        this.messageType = messageType;
        this.read = false;
    }

    public void markAsRead() {
        this.read = true;
        this.readAt = LocalDateTime.now();
    }

    public boolean isUrgent() {
        return this.messageType == ChatMessageType.URGENT;
    }
}
