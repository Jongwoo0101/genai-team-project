package com.worksight.api.service;

import com.worksight.api.dto.ChatDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.ChatMessage;
import com.worksight.api.entity.ChatRoom;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.MemberStatus;
import com.worksight.api.enums.ChatMessageType;
import com.worksight.api.enums.StatusType;
import com.worksight.api.repository.ChatMessageRepository;
import com.worksight.api.repository.ChatRoomRepository;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.MemberStatusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MemberRepository memberRepository;
    private final MemberStatusRepository memberStatusRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 채팅방 목록 조회
     * - 내가 참여한 모든 1:1 채팅방
     * - 마지막 메시지 기준 최신순 정렬
     */
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getMyChatRooms(Member me) {
        return chatRoomRepository.findAllByMemberId(me.getId())
                .stream()
                .map(room -> toChatRoomResponse(room, me.getId()))
                .sorted(Comparator.comparing(
                        r -> r.lastMessage() != null ? r.lastMessage().createdAt() : java.time.LocalDateTime.MIN,
                        Comparator.reverseOrder()
                ))
                .toList();
    }

    /**
     * 채팅방 입장 (없으면 생성) + 히스토리 반환
     * - 상대방과 채팅방이 없으면 자동 생성
     * - 입장 시 미읽음 메시지 일괄 읽음 처리
     */
    @Transactional
    public ChatRoomDetailResponse enterRoom(Member me, Long otherMemberId) {
        Member other = memberRepository.findById(otherMemberId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 사용자입니다."));

        validateSameTeam(me, other);

        ChatRoom room = findOrCreateRoom(me.getId(), other.getId());

        // 입장 시 미읽음 일괄 읽음 처리
        chatMessageRepository.markAllAsReadInRoom(room, me.getId());
        notifyReadAfterCommit(room, me.getId(), other.getId());

        // 최근 50건 → 엔티티 변환 후 오래된 순으로 재정렬
        List<ChatMessageResponse> messages = chatMessageRepository
                .findByChatRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 50))
                .stream()
                .map(this::toChatMessageResponse)
                .sorted(Comparator.comparing(ChatMessageResponse::createdAt))
                .toList();

        StatusType otherStatus = getStatus(other);

        return new ChatRoomDetailResponse(
                room.getId(),
                other.getId(),
                other.getUsername(),
                otherStatus,
                messages
        );
    }

    /**
     * 메시지 전송
     *
     * 알림 정책:
     *   - NORMAL  : 상대방이 MEETING 또는 AWAY 이면 WebSocket 메시지만 전달 (알림 미발송)
     *   - URGENT  : 상대방 상태 무관 강제 알림 (CHAT_URGENT_RECEIVED 이벤트)
     *
     * 프론트 처리:
     *   - CHAT_MESSAGE_RECEIVED → 일반 메시지 수신 처리 (배너 표시 여부는 프론트 판단)
     *   - CHAT_URGENT_RECEIVED  → 상태 무관 강제 알림음/진동 처리
     */
    @Transactional
    public ChatMessageResponse sendMessage(Member sender, Long roomId,
                                           SendMessageRequest request) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 채팅방입니다."));

        if (!room.hasMember(sender.getId())) {
            throw new IllegalArgumentException("채팅방 참여자가 아닙니다.");
        }

        Member managedSender = memberRepository.findById(sender.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        ChatMessage message = ChatMessage.builder()
                .chatRoom(room)
                .sender(managedSender)
                .content(request.content())
                .messageType(request.messageType())
                .build();
        chatMessageRepository.save(message);

        Long receiverId = room.getOtherMemberId(sender.getId());
        StatusType receiverStatus = getStatusById(receiverId);

        log.info("Chat message sent: roomId={}, senderId={}, type={}, receiverStatus={}",
                roomId, sender.getId(), request.messageType(), receiverStatus);

        pushAfterCommit(message, receiverId, receiverStatus);

        return toChatMessageResponse(message);
    }

    /**
     * 채팅창 상단 안내 배너 조회
     * 채팅창 열기 전 또는 메시지 입력 전 상대방 상태 확인용
     */
    @Transactional(readOnly = true)
    public ReceiverStatusBannerResponse getReceiverStatusBanner(Member me, Long otherMemberId) {
        Member other = memberRepository.findById(otherMemberId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 사용자입니다."));

        StatusType status = getStatus(other);
        boolean showBanner = (status == StatusType.MEETING || status == StatusType.AWAY);

        String bannerMessage = null;
        if (showBanner) {
            String statusLabel = status == StatusType.MEETING ? "회의 중" : "휴식/자리비움 상태";
            bannerMessage = "현재 " + other.getUsername() + "님은 " + statusLabel
                    + "입니다. 알림이 울리지 않습니다.";
        }

        return new ReceiverStatusBannerResponse(
                other.getId(),
                other.getUsername(),
                status,
                showBanner,
                true,           // 긴급 알림 버튼은 항상 제공
                bannerMessage
        );
    }

    /**
     * 채팅방 읽음 처리 (채팅창 포커스 시 호출)
     */
    @Transactional
    public void markAsRead(Member me, Long roomId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 채팅방입니다."));

        if (!room.hasMember(me.getId())) {
            throw new IllegalArgumentException("채팅방 참여자가 아닙니다.");
        }

        chatMessageRepository.markAllAsReadInRoom(room, me.getId());

        Long otherId = room.getOtherMemberId(me.getId());
        notifyReadAfterCommit(room, me.getId(), otherId);
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private ChatRoom findOrCreateRoom(Long myId, Long otherId) {
        long small = Math.min(myId, otherId);
        long big   = Math.max(myId, otherId);

        return chatRoomRepository.findByMembers(small, big)
                .orElseGet(() -> chatRoomRepository.save(
                        ChatRoom.builder().member1Id(small).member2Id(big).build()
                ));
    }

    /**
     * 팀 내 멤버인지 검증
     * - MANAGER가 상대방의 managerId 이거나
     * - 두 EMPLOYEE의 managerId가 같은 경우
     */
    private void validateSameTeam(Member me, Member other) {
        boolean isSameTeam =
                me.getId().equals(other.getManagerId()) ||          // 내가 상대 매니저
                other.getId().equals(me.getManagerId()) ||          // 상대가 내 매니저
                (me.getManagerId() != null &&
                 me.getManagerId().equals(other.getManagerId()));    // 같은 팀 직원

        if (!isSameTeam) {
            throw new IllegalArgumentException("같은 팀 멤버에게만 메시지를 보낼 수 있습니다.");
        }
    }

    /** 메시지 전송 후 WebSocket 푸시 — 수신자 상태에 따라 이벤트 구분 */
    private void pushAfterCommit(ChatMessage message, Long receiverId, StatusType receiverStatus) {
        ChatMessagePayload payload = new ChatMessagePayload(
                message.getChatRoom().getId(),
                message.getId(),
                message.getSender().getId(),
                message.getSender().getUsername(),
                message.getContent(),
                message.getMessageType(),
                message.getCreatedAt()
        );

        // 긴급 메시지는 수신자 상태 무관 URGENT 이벤트로 강제 알림
        String event = message.isUrgent()
                ? WsEnvelope.Event.CHAT_URGENT_RECEIVED
                : WsEnvelope.Event.CHAT_MESSAGE_RECEIVED;

        WsEnvelope envelope = WsEnvelope.of(event, payload);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend("/topic/members/" + receiverId, envelope);
                log.info("Chat pushed: event={}, receiverId={}, receiverStatus={}",
                        event, receiverId, receiverStatus);
            }
        });
    }

    /** 읽음 처리 후 발신자에게 CHAT_READ 이벤트 발송 */
    private void notifyReadAfterCommit(ChatRoom room, Long readByMemberId, Long notifyMemberId) {
        ChatReadPayload payload = new ChatReadPayload(room.getId(), readByMemberId);
        WsEnvelope envelope = WsEnvelope.of(WsEnvelope.Event.CHAT_READ, payload);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend("/topic/members/" + notifyMemberId, envelope);
            }
        });
    }

    private StatusType getStatus(Member member) {
        return memberStatusRepository.findByMember(member)
                .map(MemberStatus::getStatusType)
                .orElse(StatusType.OFFLINE);
    }

    private StatusType getStatusById(Long memberId) {
        return memberRepository.findById(memberId)
                .map(this::getStatus)
                .orElse(StatusType.OFFLINE);
    }

    private ChatRoomResponse toChatRoomResponse(ChatRoom room, Long myId) {
        Long otherId = room.getOtherMemberId(myId);
        Member other = memberRepository.findById(otherId).orElse(null);
        String otherUsername = other != null ? other.getUsername() : "(알 수 없음)";
        StatusType otherStatus = other != null ? getStatus(other) : StatusType.OFFLINE;

        ChatMessageResponse lastMsg = chatMessageRepository
                .findFirstByChatRoomOrderByCreatedAtDesc(room)
                .map(this::toChatMessageResponse)
                .orElse(null);

        long unread = chatMessageRepository.countUnreadByRoomAndReceiver(room, myId);

        return new ChatRoomResponse(
                room.getId(), otherId, otherUsername,
                otherStatus, lastMsg, unread
        );
    }

    private ChatMessageResponse toChatMessageResponse(ChatMessage m) {
        return new ChatMessageResponse(
                m.getId(),
                m.getChatRoom().getId(),
                m.getSender().getId(),
                m.getSender().getUsername(),
                m.getContent(),
                m.getMessageType(),
                m.isRead(),
                m.getCreatedAt(),
                m.getReadAt()
        );
    }
}
