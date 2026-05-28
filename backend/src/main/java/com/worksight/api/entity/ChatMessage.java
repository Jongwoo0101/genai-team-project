package com.worksight.api.entity;

import com.worksight.api.enums.ChatMessageType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 채팅 메시지 엔티티 — DIRECT / TEAM 공통
 *
 * read / readAt:
 *   - DIRECT: 1:1이므로 단일 read 필드로 충분
 *   - TEAM:   ChatRoomParticipant.lastReadAt 기준으로 미읽음 계산 → read 필드 미사용
 *
 * messageType:
 *   NORMAL — 일반 메시지 (수신자 상태에 따라 알림 분기)
 *   URGENT — 긴급 알림 (상태 무관 강제 알림, DIRECT 전용)
 */
@Entity
@Table(
    name = "chat_message",
    indexes = @Index(name = "idx_chat_message_room_id", columnList = "chat_room_id")
)
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
    private ChatMessageType messageType;

    /** DIRECT 전용 읽음 여부 */
    @Column(nullable = false)
    private boolean read;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime readAt;

    @Builder
    public ChatMessage(ChatRoom chatRoom, Member sender,
                       String content, ChatMessageType messageType) {
        this.chatRoom    = chatRoom;
        this.sender      = sender;
        this.content     = content;
        this.messageType = messageType;
        this.read        = false;
    }

    /** DIRECT 전용 — 1:1 읽음 처리 */
    public void markAsRead() {
        this.read   = true;
        this.readAt = LocalDateTime.now();
    }

    public boolean isUrgent() {
        return this.messageType == ChatMessageType.URGENT;
    }
}
