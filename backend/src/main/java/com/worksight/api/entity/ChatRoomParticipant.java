package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 팀 채팅방 참여자 테이블 (TEAM 타입 ChatRoom 전용)
 *
 * - 팀원이 합류할 때 자동으로 행 추가 (MemberService.joinTeam)
 * - 향후 퇴팀 시 삭제 또는 active = false 처리
 * - lastReadAt: 각 멤버가 마지막으로 읽은 시각 → 미읽음 수 계산에 사용
 */
@Entity
@Table(
    name = "chat_room_participant",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_participant",
        columnNames = {"chat_room_id", "member_id"}
    ),
    indexes = @Index(name = "idx_participant_room", columnList = "chat_room_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoomParticipant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    /** 마지막 읽은 시각 — 미읽음 수 계산 기준 */
    private LocalDateTime lastReadAt;

    @Column(nullable = false)
    private boolean active = true;  // 퇴팀 시 false

    @CreationTimestamp
    private LocalDateTime joinedAt;

    @Builder
    public ChatRoomParticipant(ChatRoom chatRoom, Member member) {
        this.chatRoom   = chatRoom;
        this.member     = member;
        this.lastReadAt = LocalDateTime.now();
        this.active     = true;
    }

    /** 채팅방 읽음 처리 시 호출 */
    public void updateLastReadAt() {
        this.lastReadAt = LocalDateTime.now();
    }

    /** 퇴팀 처리 */
    public void deactivate() {
        this.active = false;
    }
}
