package com.worksight.api.entity;

import com.worksight.api.enums.ChatRoomType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 채팅방 엔티티 — DIRECT(1:1) / TEAM(팀 전체) 통합
 *
 * DIRECT:
 *   - member1Id < member2Id 정렬 저장 (unique 보장)
 *   - managerId = null
 *
 * TEAM:
 *   - managerId = 팀 식별자 (매니저의 memberId)
 *   - member1Id, member2Id = null
 *   - 팀당 단 하나만 존재 (managerId unique)
 *   - 참여자는 ChatRoomParticipant 테이블로 관리
 */
@Entity
@Table(
    name = "chat_room",
    uniqueConstraints = {
        // 1:1 채팅방 중복 방지
        @UniqueConstraint(name = "uq_direct_room", columnNames = {"member1_id", "member2_id"}),
        // 팀 채팅방 중복 방지
        @UniqueConstraint(name = "uq_team_room",   columnNames = {"manager_id"})
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
    private Long member1Id;     // 항상 작은 id

    @Column(name = "member2_id")
    private Long member2Id;

    // ── TEAM 전용 ────────────────────────────────────
    @Column(name = "manager_id")
    private Long managerId;     // 팀 식별자

    @Column(length = 100)
    private String roomName;    // 팀 채팅방 이름 (ex. "개발팀 단체 채팅")

    @CreationTimestamp
    private LocalDateTime createdAt;

    // ── 생성자 ────────────────────────────────────────

    /** 1:1 채팅방 생성 */
    @Builder(builderMethodName = "directBuilder")
    public ChatRoom(Long memberAId, Long memberBId) {
        this.roomType  = ChatRoomType.DIRECT;
        this.member1Id = Math.min(memberAId, memberBId);
        this.member2Id = Math.max(memberAId, memberBId);
    }

    /** 팀 채팅방 생성 */
    @Builder(builderMethodName = "teamBuilder")
    public ChatRoom(Long managerId, String roomName) {
        this.roomType  = ChatRoomType.TEAM;
        this.managerId = managerId;
        this.roomName  = roomName;
    }

    // ── 메서드 ────────────────────────────────────────

    public boolean isDirect() { return roomType == ChatRoomType.DIRECT; }
    public boolean isTeam()   { return roomType == ChatRoomType.TEAM;   }

    /** DIRECT 전용 — 상대방 memberId 반환 */
    public Long getOtherMemberId(Long myId) {
        if (!isDirect()) throw new IllegalStateException("1:1 채팅방에서만 사용 가능합니다.");
        return myId.equals(member1Id) ? member2Id : member1Id;
    }

    /** DIRECT 전용 — 참여 여부 확인 */
    public boolean hasMember(Long memberId) {
        if (isDirect()) {
            return member1Id.equals(memberId) || member2Id.equals(memberId);
        }
        // TEAM은 ChatRoomParticipant로 확인
        throw new IllegalStateException("팀 채팅방은 ChatRoomParticipant로 확인하세요.");
    }

    public void updateRoomName(String roomName) {
        this.roomName = roomName;
    }
}
