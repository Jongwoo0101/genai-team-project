package com.worksight.api.entity;

import com.worksight.api.enums.ChatRoomType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_room")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatRoomType roomType;  // DIRECT | TEAM

    // ── DIRECT 전용 ──────────────────────────────────
    // member1Id < member2Id 로 정렬 저장 (중복 방지)
    @Column(name = "member1_id")
    private Long member1Id;

    @Column(name = "member2_id")
    private Long member2Id;

    // ── TEAM 전용 ─────────────────────────────────────
    // 팀 채팅방 소유자 (매니저)
    @Column(name = "manager_id")
    private Long managerId;

    @CreationTimestamp
    private LocalDateTime createdAt;

    /** DIRECT 채팅방 생성 */
    @Builder(builderMethodName = "directBuilder")
    public ChatRoom(Long member1Id, Long member2Id) {
        this.roomType  = ChatRoomType.DIRECT;
        this.member1Id = Math.min(member1Id, member2Id);
        this.member2Id = Math.max(member1Id, member2Id);
    }

    /** TEAM 채팅방 생성 */
    @Builder(builderMethodName = "teamBuilder")
    public ChatRoom(Long managerId, ChatRoomType roomType) {
        this.roomType  = ChatRoomType.TEAM;
        this.managerId = managerId;
    }

    public boolean hasMember(Long memberId) {
        if (roomType == ChatRoomType.DIRECT) {
            return member1Id.equals(memberId) || member2Id.equals(memberId);
        }
        // TEAM은 ChatRoomParticipant로 관리 — 서비스 레이어에서 별도 검증
        return true;
    }

    /** DIRECT 전용: 상대방 memberId 반환 */
    public Long getOtherMemberId(Long myId) {
        if (roomType != ChatRoomType.DIRECT) {
            throw new IllegalStateException("TEAM 채팅방에서는 사용할 수 없습니다.");
        }
        return myId.equals(member1Id) ? member2Id : member1Id;
    }
}