package com.worksight.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 1:1 채팅방 엔티티
 *
 * - 팀 내 두 멤버 사이에 채팅방은 단 하나만 존재 (중복 생성 방지)
 * - member1Id < member2Id 로 항상 정렬 저장 → unique 제약 활용
 */
@Entity
@Table(
    name = "chat_room",
    uniqueConstraints = @UniqueConstraint(columnNames = {"member1_id", "member2_id"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // member1Id < member2Id 로 정렬 저장 (중복 방지)
    @Column(name = "member1_id", nullable = false)
    private Long member1Id;

    @Column(name = "member2_id", nullable = false)
    private Long member2Id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Builder
    public ChatRoom(Long member1Id, Long member2Id) {
        // 항상 작은 id가 member1
        this.member1Id = Math.min(member1Id, member2Id);
        this.member2Id = Math.max(member1Id, member2Id);
    }

    public boolean hasMember(Long memberId) {
        return member1Id.equals(memberId) || member2Id.equals(memberId);
    }

    /** 상대방 memberId 반환 */
    public Long getOtherMemberId(Long myId) {
        return myId.equals(member1Id) ? member2Id : member1Id;
    }
}
