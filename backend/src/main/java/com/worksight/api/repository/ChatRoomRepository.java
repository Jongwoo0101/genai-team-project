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

    @Query("""
           SELECT cr FROM ChatRoom cr
           WHERE cr.roomType = 'DIRECT'
             AND cr.member1Id = :small AND cr.member2Id = :big
           """)
    Optional<ChatRoom> findDirectRoom(@Param("small") Long small, @Param("big") Long big);

    @Query("""
           SELECT cr FROM ChatRoom cr
           WHERE cr.roomType = 'DIRECT'
             AND (cr.member1Id = :memberId OR cr.member2Id = :memberId)
           """)
    List<ChatRoom> findDirectRoomsByMemberId(@Param("memberId") Long memberId);

    // ── TEAM ──────────────────────────────────────────

    Optional<ChatRoom> findByManagerIdAndRoomType(Long managerId, ChatRoomType roomType);

    @Query("""
           SELECT cr FROM ChatRoom cr
           JOIN ChatRoomParticipant p ON p.chatRoom = cr
           WHERE cr.roomType = 'TEAM'
             AND p.member.id = :memberId
             AND p.active = true
           """)
    List<ChatRoom> findTeamRoomsByMemberId(@Param("memberId") Long memberId);
}