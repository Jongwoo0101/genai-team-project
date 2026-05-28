package com.worksight.api.service;

import com.worksight.api.dto.ChatDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.*;
import com.worksight.api.enums.ChatMessageType;
import com.worksight.api.enums.ChatRoomType;
import com.worksight.api.enums.StatusType;
import com.worksight.api.repository.*;
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
    private final ChatRoomParticipantRepository participantRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MemberRepository memberRepository;
    private final MemberStatusRepository memberStatusRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 공통
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * 채팅방 목록 조회 — DIRECT + TEAM 통합
     * 최근 메시지 기준 최신순 정렬
     */
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getMyChatRooms(Member me) {
        List<ChatRoomResponse> direct = chatRoomRepository
                .findDirectRoomsByMemberId(me.getId())
                .stream()
                .map(room -> toDirectRoomResponse(room, me.getId()))
                .toList();

        List<ChatRoomResponse> team = chatRoomRepository
                .findTeamRoomsByMemberId(me.getId())
                .stream()
                .map(room -> toTeamRoomResponse(room, me.getId()))
                .toList();

        return java.util.stream.Stream.concat(direct.stream(), team.stream())
                .sorted(Comparator.comparing(
                        r -> r.lastMessage() != null ? r.lastMessage().createdAt() : java.time.LocalDateTime.MIN,
                        Comparator.reverseOrder()
                ))
                .toList();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1:1 채팅 (DIRECT)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * 1:1 채팅방 입장 (없으면 자동 생성)
     * 입장 시 미읽음 일괄 읽음 처리
     */
    @Transactional
    public DirectRoomDetailResponse enterDirectRoom(Member me, Long otherMemberId) {
        Member other = getMember(otherMemberId);
        validateSameTeam(me, other);

        ChatRoom room = findOrCreateDirectRoom(me.getId(), other.getId());

        chatMessageRepository.markAllAsReadInDirectRoom(room, me.getId());
        notifyReadAfterCommit(room, me.getId(), other.getId());

        List<ChatMessageResponse> messages = getMessages(room);
        return new DirectRoomDetailResponse(
                room.getId(),
                other.getId(), other.getUsername(), getStatus(other),
                messages
        );
    }

    /**
     * 1:1 메시지 전송
     * - NORMAL: 수신자 MEETING/AWAY 시 CHAT_MESSAGE_RECEIVED (알림 미발송은 프론트 처리)
     * - URGENT: 상태 무관 CHAT_URGENT_RECEIVED
     */
    @Transactional
    public ChatMessageResponse sendDirectMessage(Member sender, Long roomId,
                                                 SendMessageRequest request) {
        ChatRoom room = getRoom(roomId);
        if (!room.isDirect())
            throw new IllegalArgumentException("1:1 채팅방이 아닙니다. 팀 채팅은 /team 엔드포인트를 사용하세요.");
        if (!room.hasMember(sender.getId()))
            throw new IllegalArgumentException("채팅방 참여자가 아닙니다.");

        Member managedSender = getMember(sender.getId());
        ChatMessage message = saveMessage(room, managedSender, request);

        Long receiverId     = room.getOtherMemberId(sender.getId());
        StatusType recvStatus = getStatusById(receiverId);

        String event = message.isUrgent()
                ? WsEnvelope.Event.CHAT_URGENT_RECEIVED
                : WsEnvelope.Event.CHAT_MESSAGE_RECEIVED;

        pushToMemberAfterCommit(event, message, receiverId);

        log.info("Direct message: roomId={}, senderId={}, type={}, receiverStatus={}",
                roomId, sender.getId(), request.messageType(), recvStatus);
        return toChatMessageResponse(message);
    }

    /** 1:1 채팅창 상단 배너 — 상대방 상태 확인 */
    @Transactional(readOnly = true)
    public ReceiverStatusBannerResponse getReceiverStatusBanner(Member me, Long otherMemberId) {
        Member other  = getMember(otherMemberId);
        StatusType st = getStatus(other);
        boolean show  = st == StatusType.MEETING || st == StatusType.AWAY;

        String banner = show
                ? "현재 " + other.getUsername() + "님은 "
                  + (st == StatusType.MEETING ? "회의 중" : "휴식/자리비움 상태")
                  + "입니다. 알림이 울리지 않습니다."
                : null;

        return new ReceiverStatusBannerResponse(
                other.getId(), other.getUsername(), st,
                show, true, banner
        );
    }

    /** 1:1 채팅방 읽음 처리 */
    @Transactional
    public void markDirectAsRead(Member me, Long roomId) {
        ChatRoom room = getRoom(roomId);
        assertDirectParticipant(room, me.getId());
        chatMessageRepository.markAllAsReadInDirectRoom(room, me.getId());
        notifyReadAfterCommit(room, me.getId(), room.getOtherMemberId(me.getId()));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 팀 채팅 (TEAM)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * 팀 채팅방 생성 — 매니저가 팀을 구성하면 자동 생성되어야 하며
     * MemberService.joinTeam 에서도 호출.
     * 이미 존재하면 기존 방 반환 (멱등).
     */
    @Transactional
    public ChatRoom findOrCreateTeamRoom(Long managerId) {
        return chatRoomRepository
                .findByManagerIdAndRoomType(managerId, ChatRoomType.TEAM)
                .orElseGet(() -> {
                    Member manager = getMember(managerId);
                    ChatRoom room = ChatRoom.teamBuilder()
                            .managerId(managerId)
                            .roomName(manager.getUsername() + "팀 채팅")
                            .build();
                    ChatRoom saved = chatRoomRepository.save(room);

                    // 매니저를 첫 참여자로 추가
                    participantRepository.save(
                            ChatRoomParticipant.builder().chatRoom(saved).member(manager).build()
                    );
                    log.info("Team chat room created: managerId={}, roomId={}", managerId, saved.getId());
                    return saved;
                });
    }

    /**
     * 팀원 합류 시 팀 채팅방에 참여자 추가
     * MemberService.joinTeam 에서 호출
     */
    @Transactional
    public void addParticipantToTeamRoom(Long managerId, Member newMember) {
        ChatRoom room = findOrCreateTeamRoom(managerId);
        Member managed = getMember(newMember.getId());

        if (!participantRepository.existsByChatRoomAndMemberAndActiveTrue(room, managed)) {
            participantRepository.save(
                    ChatRoomParticipant.builder().chatRoom(room).member(managed).build()
            );
            // 팀 전체에 참여자 변경 알림
            pushToTeamAfterCommit(WsEnvelope.Event.TEAM_CHAT_MEMBER_JOINED, room.getId(),
                    managerId, new ParticipantInfo(
                            managed.getId(), managed.getUsername(), getStatus(managed)));
            log.info("Member added to team chat: managerId={}, memberId={}", managerId, managed.getId());
        }
    }

    /**
     * 팀 채팅방 입장
     * - 참여자가 아니면 400
     * - 입장 시 lastReadAt 갱신 (미읽음 초기화)
     */
    @Transactional
    public TeamRoomDetailResponse enterTeamRoom(Member me, Long roomId) {
        ChatRoom room = getRoom(roomId);
        if (!room.isTeam()) throw new IllegalArgumentException("팀 채팅방이 아닙니다.");

        Member managed = getMember(me.getId());
        ChatRoomParticipant participant = getParticipant(room, managed);
        participant.updateLastReadAt();   // 읽음 처리

        List<ChatRoomParticipant> participants =
                participantRepository.findByChatRoomAndActiveTrue(room);

        List<ParticipantInfo> participantInfos = participants.stream()
                .map(p -> new ParticipantInfo(
                        p.getMember().getId(),
                        p.getMember().getUsername(),
                        getStatus(p.getMember())
                ))
                .toList();

        List<ChatMessageResponse> messages = getMessages(room);

        return new TeamRoomDetailResponse(
                room.getId(), room.getRoomName(), room.getManagerId(),
                participantInfos, messages
        );
    }

    /**
     * 팀 채팅 메시지 전송
     * - URGENT 타입 불허 (팀 채팅에서는 긴급 알림 없음)
     * - 발송 후 /topic/team/{managerId} 로 브로드캐스트
     */
    @Transactional
    public ChatMessageResponse sendTeamMessage(Member sender, Long roomId,
                                               SendMessageRequest request) {
        if (request.messageType() == ChatMessageType.URGENT)
            throw new IllegalArgumentException("팀 채팅에서는 긴급 알림을 사용할 수 없습니다.");

        ChatRoom room = getRoom(roomId);
        if (!room.isTeam()) throw new IllegalArgumentException("팀 채팅방이 아닙니다.");

        Member managed = getMember(sender.getId());
        assertTeamParticipant(room, managed);

        ChatMessage message = saveMessage(room, managed, request);

        pushToTeamAfterCommit(WsEnvelope.Event.TEAM_CHAT_MESSAGE, room.getId(),
                room.getManagerId(), toChatMessagePayload(message));

        log.info("Team message: roomId={}, senderId={}", roomId, sender.getId());
        return toChatMessageResponse(message);
    }

    /**
     * 팀 채팅 읽음 처리 (채팅창 포커스 시 호출)
     * lastReadAt 갱신 → 미읽음 카운트 0으로 초기화
     */
    @Transactional
    public void markTeamAsRead(Member me, Long roomId) {
        ChatRoom room = getRoom(roomId);
        if (!room.isTeam()) throw new IllegalArgumentException("팀 채팅방이 아닙니다.");
        ChatRoomParticipant participant = getParticipant(room, getMember(me.getId()));
        participant.updateLastReadAt();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 내부 헬퍼
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private ChatRoom findOrCreateDirectRoom(Long myId, Long otherId) {
        long small = Math.min(myId, otherId);
        long big   = Math.max(myId, otherId);
        return chatRoomRepository.findDirectRoom(small, big)
                .orElseGet(() -> chatRoomRepository.save(
                        ChatRoom.directBuilder().memberAId(small).memberBId(big).build()
                ));
    }

    private ChatMessage saveMessage(ChatRoom room, Member sender, SendMessageRequest req) {
        return chatMessageRepository.save(ChatMessage.builder()
                .chatRoom(room)
                .sender(sender)
                .content(req.content())
                .messageType(req.messageType())
                .build());
    }

    private List<ChatMessageResponse> getMessages(ChatRoom room) {
        return chatMessageRepository
                .findByChatRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 50))
                .stream()
                .map(this::toChatMessageResponse)
                .sorted(Comparator.comparing(ChatMessageResponse::createdAt))
                .toList();
    }

    private void validateSameTeam(Member me, Member other) {
        boolean sameTeam =
                me.getId().equals(other.getManagerId()) ||
                other.getId().equals(me.getManagerId()) ||
                (me.getManagerId() != null && me.getManagerId().equals(other.getManagerId()));
        if (!sameTeam)
            throw new IllegalArgumentException("같은 팀 멤버에게만 메시지를 보낼 수 있습니다.");
    }

    private void assertDirectParticipant(ChatRoom room, Long memberId) {
        if (!room.hasMember(memberId))
            throw new IllegalArgumentException("채팅방 참여자가 아닙니다.");
    }

    private void assertTeamParticipant(ChatRoom room, Member member) {
        if (!participantRepository.existsByChatRoomAndMemberAndActiveTrue(room, member))
            throw new IllegalArgumentException("팀 채팅방 참여자가 아닙니다.");
    }

    private ChatRoomParticipant getParticipant(ChatRoom room, Member member) {
        return participantRepository.findByChatRoomAndMember(room, member)
                .filter(ChatRoomParticipant::isActive)
                .orElseThrow(() -> new IllegalArgumentException("팀 채팅방 참여자가 아닙니다."));
    }

    /** 개인 채널 푸시 — /topic/members/{receiverId} */
    private void pushToMemberAfterCommit(String event, ChatMessage message, Long receiverId) {
        WsEnvelope envelope = WsEnvelope.of(event, toChatMessagePayload(message));
        afterCommit(() -> messagingTemplate.convertAndSend(
                "/topic/members/" + receiverId, envelope));
    }

    /** 팀 채널 브로드캐스트 — /topic/team/{managerId} */
    private void pushToTeamAfterCommit(String event, Long roomId, Long managerId, Object data) {
        WsEnvelope envelope = WsEnvelope.of(event, data);
        afterCommit(() -> messagingTemplate.convertAndSend(
                "/topic/team/" + managerId, envelope));
    }

    /** DIRECT 읽음 — 발신자에게 CHAT_READ 발송 */
    private void notifyReadAfterCommit(ChatRoom room, Long readByMemberId, Long notifyMemberId) {
        WsEnvelope envelope = WsEnvelope.of(
                WsEnvelope.Event.CHAT_READ,
                new ChatReadPayload(room.getId(), readByMemberId));
        afterCommit(() -> messagingTemplate.convertAndSend(
                "/topic/members/" + notifyMemberId, envelope));
    }

    private void afterCommit(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { action.run(); }
        });
    }

    private StatusType getStatus(Member member) {
        return memberStatusRepository.findByMember(member)
                .map(MemberStatus::getStatusType)
                .orElse(StatusType.OFFLINE);
    }

    private StatusType getStatusById(Long id) {
        return memberRepository.findById(id).map(this::getStatus).orElse(StatusType.OFFLINE);
    }

    private Member getMember(Long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 회원입니다."));
    }

    private ChatRoom getRoom(Long id) {
        return chatRoomRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 채팅방입니다."));
    }

    // ── 변환 ─────────────────────────────────

    private ChatRoomResponse toDirectRoomResponse(ChatRoom room, Long myId) {
        Long otherId  = room.getOtherMemberId(myId);
        Member other  = memberRepository.findById(otherId).orElse(null);
        long unread   = chatMessageRepository.countUnreadDirect(room, myId);
        ChatMessageResponse last = chatMessageRepository
                .findFirstByChatRoomOrderByCreatedAtDesc(room)
                .map(this::toChatMessageResponse).orElse(null);

        return new ChatRoomResponse(
                room.getId(), ChatRoomType.DIRECT,
                otherId, other != null ? other.getUsername() : "(알 수 없음)",
                other != null ? getStatus(other) : StatusType.OFFLINE,
                null, 0,
                last, unread
        );
    }

    private ChatRoomResponse toTeamRoomResponse(ChatRoom room, Long myId) {
        int count = participantRepository.findByChatRoomAndActiveTrue(room).size();
        long unread = participantRepository.countUnreadTeamMessages(room, myId);
        ChatMessageResponse last = chatMessageRepository
                .findFirstByChatRoomOrderByCreatedAtDesc(room)
                .map(this::toChatMessageResponse).orElse(null);

        return new ChatRoomResponse(
                room.getId(), ChatRoomType.TEAM,
                null, null, null,
                room.getRoomName(), count,
                last, unread
        );
    }

    private ChatMessageResponse toChatMessageResponse(ChatMessage m) {
        return new ChatMessageResponse(
                m.getId(), m.getChatRoom().getId(), m.getChatRoom().getRoomType(),
                m.getSender().getId(), m.getSender().getUsername(),
                m.getContent(), m.getMessageType(),
                m.isRead(), m.getCreatedAt(), m.getReadAt()
        );
    }

    private ChatMessagePayload toChatMessagePayload(ChatMessage m) {
        return new ChatMessagePayload(
                m.getChatRoom().getId(), m.getChatRoom().getRoomType(),
                m.getId(), m.getSender().getId(), m.getSender().getUsername(),
                m.getContent(), m.getMessageType(), m.getCreatedAt()
        );
    }
}
