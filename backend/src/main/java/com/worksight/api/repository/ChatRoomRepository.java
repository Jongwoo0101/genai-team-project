package com.worksight.api.repository;

import com.worksight.api.entity.ChatRoom;
import com.worksight.api.enums.ChatRoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    // ── DIRECT ────────────────────────────────────────

    /** 1:1 채팅방 조회 (member1Id < member2Id 정렬 규칙 활용) */
    @Query("""
           SELECT cr FROM ChatRoom cr
           WHERE cr.roomType = 'DIRECT'
             AND cr.member1Id = :small AND cr.member2Id = :big
           """)
    Optional<ChatRoom> findDirectRoom(@Param("small") Long small, @Param("big") Long big);

    /** 내가 참여한 1:1 채팅방 목록 */
    @Query("""
           SELECT cr FROM ChatRoom cr
           WHERE cr.roomType = 'DIRECT'
             AND (cr.member1Id = :memberId OR cr.member2Id = :memberId)
           """)
    List<ChatRoom> findDirectRoomsByMemberId(@Param("memberId") Long memberId);

    // ── TEAM ──────────────────────────────────────────

    /** 팀 채팅방 조회 (managerId 기준) */
    Optional<ChatRoom> findByManagerIdAndRoomType(Long managerId, ChatRoomType roomType);

    /** 내가 참여 중인 팀 채팅방 — ChatRoomParticipant 조인 */
    @Query("""
           SELECT cr FROM ChatRoom cr
           JOIN ChatRoomParticipant p ON p.chatRoom = cr
           WHERE cr.roomType = 'TEAM'
             AND p.member.id = :memberId
             AND p.active = true
           """)
    List<ChatRoom> findTeamRoomsByMemberId(@Param("memberId") Long memberId);
}
