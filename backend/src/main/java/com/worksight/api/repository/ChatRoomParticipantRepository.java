package com.worksight.api.repository;

import com.worksight.api.entity.ChatRoom;
import com.worksight.api.entity.ChatRoomParticipant;
import com.worksight.api.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomParticipantRepository extends JpaRepository<ChatRoomParticipant, Long> {

    List<ChatRoomParticipant> findByChatRoomAndActiveTrue(ChatRoom chatRoom);

    Optional<ChatRoomParticipant> findByChatRoomAndMember(ChatRoom chatRoom, Member member);

    boolean existsByChatRoomAndMemberAndActiveTrue(ChatRoom chatRoom, Member member);

    /** 팀 채팅 미읽음 수 — lastReadAt 이후 메시지 수 */
    @Query("""
           SELECT COUNT(cm) FROM ChatMessage cm
           JOIN ChatRoomParticipant p
             ON p.chatRoom = cm.chatRoom AND p.member.id = :memberId
           WHERE cm.chatRoom = :room
             AND cm.sender.id != :memberId
             AND cm.createdAt > p.lastReadAt
             AND p.active = true
           """)
    long countUnreadTeamMessages(@Param("room") ChatRoom room,
                                 @Param("memberId") Long memberId);

    /**
     * TEAM 채팅 WebSocket 푸시 시 Member 전체 로딩 없이 ID만 조회
     * 기존: findByChatRoomAndActiveTrue → p.getMember().getId() (Member lazy load → N+1)
     * 개선: memberId만 SELECT
     */
    @Query("""
           SELECT p.member.id FROM ChatRoomParticipant p
           WHERE p.chatRoom = :room
             AND p.active = true
           """)
    List<Long> findActiveMemberIds(@Param("room") ChatRoom room);
}
