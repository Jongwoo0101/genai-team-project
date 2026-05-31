package com.worksight.api.entity;

import com.worksight.api.enums.ChatRoomType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * DIRECT 채팅방 중복 생성 race condition 방어
 * (member1_id, member2_id) 유니크 제약 추가
 * 두 사용자가 동시에 처음 대화를 시작할 경우
 * SELECT → INSERT 사이의 gap에서 중복 INSERT가 발생할 수 있다.
 * DB 유니크 제약이 두 번째 INSERT를 막고,
 * DataIntegrityViolationException → GlobalExceptionHandler에서 409로 응답한다.
 * 팀 채팅방은 team_id 기반으로 관리 (기존 manager_id → team_id 변경 반영)
 */
@Entity
@Table(
    name = "chat_room",
    uniqueConstraints = {
        // DIRECT 채팅방 중복 생성 방지
        @UniqueConstraint(name = "uq_direct_room", columnNames = {"member1_id", "member2_id"})
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatRoomType roomType;

    // ── DIRECT 전용 ──────────────────────────────────
    @Column(name = "member1_id")
    private Long member1Id;

    @Column(name = "member2_id")
    private Long member2Id;

    // ── TEAM 전용 ─────────────────────────────────────
    // 기존 manager_id → team_id 변경 (Team 엔티티 도입에 따른 수정)
    @Column(name = "team_id")
    private Long teamId;

    @CreationTimestamp
    private LocalDateTime createdAt;

    /** DIRECT 채팅방 생성 */
    @Builder(builderMethodName = "directBuilder", builderClassName = "DirectBuilder")
    public ChatRoom(Long member1Id, Long member2Id) {
        this.roomType  = ChatRoomType.DIRECT;
        this.member1Id = Math.min(member1Id, member2Id);
        this.member2Id = Math.max(member1Id, member2Id);
    }

    /** TEAM 채팅방 생성 */
    @Builder(builderMethodName = "teamBuilder", builderClassName = "TeamBuilder")
    public ChatRoom(Long teamId, ChatRoomType roomType) {
        this.roomType = ChatRoomType.TEAM;
        this.teamId   = teamId;
    }

    public boolean hasMember(Long memberId) {
        if (roomType == ChatRoomType.DIRECT) {
            return member1Id.equals(memberId) || member2Id.equals(memberId);
        }
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
