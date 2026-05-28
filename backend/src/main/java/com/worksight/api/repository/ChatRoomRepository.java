package com.worksight.api.repository;

import com.worksight.api.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    /**
     * 두 멤버 간 채팅방 조회
     * member1Id < member2Id 정렬 저장 규칙을 그대로 활용
     */
    @Query("""
           SELECT cr FROM ChatRoom cr
           WHERE cr.member1Id = :small AND cr.member2Id = :big
           """)
    Optional<ChatRoom> findByMembers(@Param("small") Long smallId, @Param("big") Long bigId);

    /**
     * 내가 참여한 채팅방 목록 조회 (최근 메시지 기준 정렬은 서비스에서 처리)
     */
    @Query("""
           SELECT cr FROM ChatRoom cr
           WHERE cr.member1Id = :memberId OR cr.member2Id = :memberId
           """)
    List<ChatRoom> findAllByMemberId(@Param("memberId") Long memberId);
}
