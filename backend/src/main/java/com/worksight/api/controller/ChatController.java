package com.worksight.api.controller;

import com.worksight.api.dto.ChatDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * GET /api/chat/rooms
     * 내 채팅방 목록 조회 (최근 메시지 기준 최신순)
     */
    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomResponse>> getMyChatRooms(
            @AuthenticationPrincipal Member me
    ) {
        return ResponseEntity.ok(chatService.getMyChatRooms(me));
    }

    /**
     * POST /api/chat/rooms/{otherMemberId}/enter
     * 채팅방 입장 — 없으면 자동 생성, 미읽음 일괄 읽음 처리
     */
    @PostMapping("/rooms/{otherMemberId}/enter")
    public ResponseEntity<ChatRoomDetailResponse> enterRoom(
            @AuthenticationPrincipal Member me,
            @PathVariable Long otherMemberId
    ) {
        return ResponseEntity.ok(chatService.enterRoom(me, otherMemberId));
    }

    /**
     * POST /api/chat/rooms/{roomId}/messages
     * 메시지 전송
     * body: { "content": "...", "messageType": "NORMAL" | "URGENT" }
     */
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @AuthenticationPrincipal Member me,
            @PathVariable Long roomId,
            @RequestBody SendMessageRequest request
    ) {
        return ResponseEntity.ok(chatService.sendMessage(me, roomId, request));
    }

    /**
     * GET /api/chat/rooms/{otherMemberId}/status-banner
     * 채팅창 상단 안내 배너 조회
     * 상대방이 MEETING/AWAY 상태일 때 프론트 배너 표시 여부 판단
     *
     * 프론트 활용 예시:
     *   showBanner === true → "[현재 OOO님은 회의 중입니다. 알림이 울리지 않습니다.]" 표시
     *   canSendUrgent === true → 긴급 알림 버튼 활성화
     */
    @GetMapping("/rooms/{otherMemberId}/status-banner")
    public ResponseEntity<ReceiverStatusBannerResponse> getStatusBanner(
            @AuthenticationPrincipal Member me,
            @PathVariable Long otherMemberId
    ) {
        return ResponseEntity.ok(chatService.getReceiverStatusBanner(me, otherMemberId));
    }

    /**
     * POST /api/chat/rooms/{roomId}/read
     * 채팅방 읽음 처리 (채팅창 포커스 시 호출)
     * 발신자에게 CHAT_READ WebSocket 이벤트 전송
     */
    @PostMapping("/rooms/{roomId}/read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal Member me,
            @PathVariable Long roomId
    ) {
        chatService.markAsRead(me, roomId);
        return ResponseEntity.ok().build();
    }
}
