package com.worksight.api.dto;

import com.worksight.api.enums.ChatMessageType;
import com.worksight.api.enums.StatusType;

import java.time.LocalDateTime;
import java.util.List;

public class ChatDto {


    /**
     * 메시지 전송 요청
     * messageType: NORMAL(기본) | URGENT(긴급 알림 버튼 클릭 시)
     */
    public record SendMessageRequest(
            String content,
            ChatMessageType messageType     // 생략 시 NORMAL
    ) {
        public SendMessageRequest {
            if (messageType == null) messageType = ChatMessageType.NORMAL;
            if (content == null || content.isBlank())
                throw new IllegalArgumentException("메시지 내용을 입력해주세요.");
            if (content.length() > 2000)
                throw new IllegalArgumentException("메시지는 2000자를 초과할 수 없습니다.");
        }
    }


    /** 채팅방 목록 응답 */
    public record ChatRoomResponse(
            Long roomId,
            Long otherMemberId,
            String otherMemberUsername,
            StatusType otherMemberStatus,       // 상대방 현재 상태
            ChatMessageResponse lastMessage,    // 최근 메시지 미리보기 (없으면 null)
            long unreadCount                    // 안 읽은 메시지 수
    ) {}

    /** 메시지 응답 */
    public record ChatMessageResponse(
            Long messageId,
            Long roomId,
            Long senderId,
            String senderUsername,
            String content,
            ChatMessageType messageType,
            boolean read,
            LocalDateTime createdAt,
            LocalDateTime readAt
    ) {}

    /** 채팅방 입장 시 초기 응답 (메시지 히스토리 + 상대방 상태) */
    public record ChatRoomDetailResponse(
            Long roomId,
            Long otherMemberId,
            String otherMemberUsername,
            StatusType otherMemberStatus,
            List<ChatMessageResponse> messages  // 최근 50건
    ) {}

    /**
     * 채팅창 상단 안내 배너 응답
     * 상대방이 MEETING 또는 AWAY 상태일 때 프론트에서 안내 문구 표시용
     *
     * showBanner: true이면 프론트에서 "[OOO님은 현재 {statusLabel}입니다. 알림이 울리지 않습니다.]" 표시
     * canSendUrgent: true이면 긴급 알림 버튼 활성화
     */
    public record ReceiverStatusBannerResponse(
            Long otherMemberId,
            String otherMemberUsername,
            StatusType otherMemberStatus,
            boolean showBanner,         // MEETING 또는 AWAY일 때 true
            boolean canSendUrgent,      // 항상 true (긴급 버튼은 언제나 제공)
            String bannerMessage        // ex. "현재 OOO님은 회의 중입니다. 알림이 울리지 않습니다."
    ) {}

    /** WebSocket 실시간 메시지 수신 페이로드 */
    public record ChatMessagePayload(
            Long roomId,
            Long messageId,
            Long senderId,
            String senderUsername,
            String content,
            ChatMessageType messageType,
            LocalDateTime createdAt
    ) {}

    /** 읽음 처리 WebSocket 페이로드 */
    public record ChatReadPayload(
            Long roomId,
            Long readByMemberId
    ) {}
}
