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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 공통
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * GET /api/chat/rooms
     * DIRECT + TEAM 통합 채팅방 목록 (최근 메시지 기준 최신순)
     */
    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomResponse>> getMyChatRooms(
            @AuthenticationPrincipal Member me
    ) {
        return ResponseEntity.ok(chatService.getMyChatRooms(me));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1:1 채팅 (DIRECT)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * POST /api/chat/direct/{otherMemberId}/enter
     * 1:1 채팅방 입장 (없으면 자동 생성 + 미읽음 읽음 처리)
     */
    @PostMapping("/direct/{otherMemberId}/enter")
    public ResponseEntity<DirectRoomDetailResponse> enterDirectRoom(
            @AuthenticationPrincipal Member me,
            @PathVariable Long otherMemberId
    ) {
        return ResponseEntity.ok(chatService.enterDirectRoom(me, otherMemberId));
    }

    /**
     * POST /api/chat/rooms/{roomId}/direct/messages
     * 1:1 메시지 전송 (NORMAL / URGENT)
     */
    @PostMapping("/rooms/{roomId}/direct/messages")
    public ResponseEntity<ChatMessageResponse> sendDirectMessage(
            @AuthenticationPrincipal Member me,
            @PathVariable Long roomId,
            @RequestBody SendMessageRequest request
    ) {
        return ResponseEntity.ok(chatService.sendDirectMessage(me, roomId, request));
    }

    /**
     * GET /api/chat/direct/{otherMemberId}/status-banner
     * 1:1 채팅창 상단 배너 — 상대방 상태 확인
     * showBanner: true → "[OOO님은 현재 회의 중입니다. 알림이 울리지 않습니다.]" 표시
     */
    @GetMapping("/direct/{otherMemberId}/status-banner")
    public ResponseEntity<ReceiverStatusBannerResponse> getStatusBanner(
            @AuthenticationPrincipal Member me,
            @PathVariable Long otherMemberId
    ) {
        return ResponseEntity.ok(chatService.getReceiverStatusBanner(me, otherMemberId));
    }

    /**
     * POST /api/chat/rooms/{roomId}/direct/read
     * 1:1 채팅방 읽음 처리 (채팅창 포커스 시 호출)
     */
    @PostMapping("/rooms/{roomId}/direct/read")
    public ResponseEntity<Void> markDirectAsRead(
            @AuthenticationPrincipal Member me,
            @PathVariable Long roomId
    ) {
        chatService.markDirectAsRead(me, roomId);
        return ResponseEntity.ok().build();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 팀 채팅 (TEAM)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * POST /api/chat/team/{roomId}/enter
     * 팀 채팅방 입장 + lastReadAt 갱신 (미읽음 초기화)
     */
    @PostMapping("/team/{roomId}/enter")
    public ResponseEntity<TeamRoomDetailResponse> enterTeamRoom(
            @AuthenticationPrincipal Member me,
            @PathVariable Long roomId
    ) {
        return ResponseEntity.ok(chatService.enterTeamRoom(me, roomId));
    }

    /**
     * POST /api/chat/rooms/{roomId}/team/messages
     * 팀 채팅 메시지 전송 (NORMAL만 허용, URGENT 불가)
     */
    @PostMapping("/rooms/{roomId}/team/messages")
    public ResponseEntity<ChatMessageResponse> sendTeamMessage(
            @AuthenticationPrincipal Member me,
            @PathVariable Long roomId,
            @RequestBody SendMessageRequest request
    ) {
        return ResponseEntity.ok(chatService.sendTeamMessage(me, roomId, request));
    }

    /**
     * POST /api/chat/rooms/{roomId}/team/read
     * 팀 채팅방 읽음 처리 (lastReadAt 갱신)
     */
    @PostMapping("/rooms/{roomId}/team/read")
    public ResponseEntity<Void> markTeamAsRead(
            @AuthenticationPrincipal Member me,
            @PathVariable Long roomId
    ) {
        chatService.markTeamAsRead(me, roomId);
        return ResponseEntity.ok().build();
    }
}
