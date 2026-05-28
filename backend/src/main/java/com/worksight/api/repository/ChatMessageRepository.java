package com.worksight.api.repository;

import com.worksight.api.entity.ChatMessage;
import com.worksight.api.entity.ChatRoom;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** 채팅방 메시지 최신순 조회 (페이징) — 채팅창 입장 시 최근 50건 */
    List<ChatMessage> findByChatRoomOrderByCreatedAtDesc(ChatRoom chatRoom, Pageable pageable);

    /** 채팅방 마지막 메시지 조회 — 채팅방 목록 미리보기용 */
    Optional<ChatMessage> findFirstByChatRoomOrderByCreatedAtDesc(ChatRoom chatRoom);

    /** 내가 수신한 미읽음 메시지 수 — 채팅방 단위 */
    @Query("""
           SELECT COUNT(cm) FROM ChatMessage cm
           WHERE cm.chatRoom = :room
             AND cm.sender.id != :myId
             AND cm.read = false
           """)
    long countUnreadByRoomAndReceiver(@Param("room") ChatRoom room,
                                      @Param("myId") Long myId);

    /** 채팅방 내 내가 수신한 미읽음 메시지 일괄 읽음 처리 */
    @Modifying
    @Query("""
           UPDATE ChatMessage cm
           SET cm.read = true, cm.readAt = CURRENT_TIMESTAMP
           WHERE cm.chatRoom = :room
             AND cm.sender.id != :myId
             AND cm.read = false
           """)
    void markAllAsReadInRoom(@Param("room") ChatRoom room,
                             @Param("myId") Long myId);
}
