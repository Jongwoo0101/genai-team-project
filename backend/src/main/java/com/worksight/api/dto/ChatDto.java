package com.worksight.api.dto;

import com.worksight.api.enums.ChatMessageType;
import com.worksight.api.enums.ChatRoomType;
import com.worksight.api.enums.StatusType;

import java.time.LocalDateTime;
import java.util.List;

public class ChatDto {

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 요청
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * 메시지 전송 요청 — DIRECT / TEAM 공통
     * URGENT는 DIRECT 전용. TEAM 채널에서 URGENT 전송 시 400 반환.
     */
    public record SendMessageRequest(
            String content,
            ChatMessageType messageType
    ) {
        public SendMessageRequest {
            if (messageType == null) messageType = ChatMessageType.NORMAL;
            if (content == null || content.isBlank())
                throw new IllegalArgumentException("메시지 내용을 입력해주세요.");
            if (content.length() > 2000)
                throw new IllegalArgumentException("메시지는 2000자를 초과할 수 없습니다.");
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 응답
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * 채팅방 목록 응답 — DIRECT / TEAM 통합
     *
     * DIRECT: otherMemberId / otherMemberUsername / otherMemberStatus 사용
     * TEAM:   roomName 사용, other* 필드는 null
     */
    public record ChatRoomResponse(
            Long roomId,
            ChatRoomType roomType,

            // DIRECT 전용
            Long otherMemberId,
            String otherMemberUsername,
            StatusType otherMemberStatus,

            // TEAM 전용
            String roomName,
            int participantCount,

            // 공통
            ChatMessageResponse lastMessage,
            long unreadCount
    ) {}

    /** 메시지 응답 */
    public record ChatMessageResponse(
            Long messageId,
            Long roomId,
            ChatRoomType roomType,
            Long senderId,
            String senderUsername,
            String content,
            ChatMessageType messageType,
            boolean read,           // DIRECT 전용, TEAM은 항상 false
            LocalDateTime createdAt,
            LocalDateTime readAt
    ) {}

    /**
     * DIRECT 채팅방 입장 응답
     */
    public record DirectRoomDetailResponse(
            Long roomId,
            Long otherMemberId,
            String otherMemberUsername,
            StatusType otherMemberStatus,
            List<ChatMessageResponse> messages
    ) {}

    /**
     * TEAM 채팅방 입장 응답
     */
    public record TeamRoomDetailResponse(
            Long roomId,
            String roomName,
            Long managerId,
            List<ParticipantInfo> participants,
            List<ChatMessageResponse> messages  // 최근 50건
    ) {}

    /** 팀 채팅 참여자 정보 */
    public record ParticipantInfo(
            Long memberId,
            String username,
            StatusType status
    ) {}

    /**
     * DIRECT 채팅창 상단 배너 응답
     * showBanner true → "[OOO님은 현재 회의 중입니다. 알림이 울리지 않습니다.]" 표시
     */
    public record ReceiverStatusBannerResponse(
            Long otherMemberId,
            String otherMemberUsername,
            StatusType otherMemberStatus,
            boolean showBanner,
            boolean canSendUrgent,
            String bannerMessage
    ) {}

    /** WebSocket 실시간 메시지 페이로드 — DIRECT / TEAM 공통 */
    public record ChatMessagePayload(
            Long roomId,
            ChatRoomType roomType,
            Long messageId,
            Long senderId,
            String senderUsername,
            String content,
            ChatMessageType messageType,
            LocalDateTime createdAt
    ) {}

    /** DIRECT 읽음 처리 WebSocket 페이로드 */
    public record ChatReadPayload(
            Long roomId,
            Long readByMemberId
    ) {}
}
