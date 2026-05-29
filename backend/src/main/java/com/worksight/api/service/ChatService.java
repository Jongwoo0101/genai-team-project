package com.worksight.api.service;

import com.worksight.api.dto.ChatDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.*;
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

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomParticipantRepository participantRepository;
    private final MemberRepository memberRepository;
    private final MemberStatusRepository memberStatusRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ── 채팅방 목록 ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getMyChatRooms(Member me) {
        List<ChatRoom> direct = chatRoomRepository.findDirectRoomsByMemberId(me.getId());
        List<ChatRoom> team   = chatRoomRepository.findTeamRoomsByMemberId(me.getId());

        List<ChatRoom> all = new ArrayList<>();
        all.addAll(direct);
        all.addAll(team);

        return all.stream()
                .map(room -> toChatRoomResponse(room, me.getId()))
                .sorted(Comparator.comparing(
                        r -> r.lastMessage() != null ? r.lastMessage().createdAt() : java.time.LocalDateTime.MIN,
                        Comparator.reverseOrder()
                ))
                .toList();
    }

    // ── DIRECT 채팅방 입장 ────────────────────────────────────────

    @Transactional
    public ChatRoomDetailResponse enterRoom(Member me, Long otherMemberId) {
        Member other = memberRepository.findById(otherMemberId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 사용자입니다."));

        validateSameTeam(me, other);

        ChatRoom room = findOrCreateDirectRoom(me.getId(), other.getId());

        chatMessageRepository.markAllAsReadInDirectRoom(room, me.getId());
        notifyReadAfterCommit(room, me.getId(), other.getId());

        List<ChatMessageResponse> messages = chatMessageRepository
                .findByChatRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 50))
                .stream()
                .map(this::toChatMessageResponse)
                .sorted(Comparator.comparing(ChatMessageResponse::createdAt))
                .toList();

        return new ChatRoomDetailResponse(
                room.getId(),
                other.getId(),
                other.getUsername(),
                getStatus(other),
                messages
        );
    }

    // ── TEAM 채팅방 입장 ──────────────────────────────────────────

    @Transactional
    public ChatRoomDetailResponse enterTeamRoom(Member me, Long roomId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 채팅방입니다."));

        if (room.getRoomType() != ChatRoomType.TEAM) {
            throw new IllegalArgumentException("팀 채팅방이 아닙니다.");
        }

        ChatRoomParticipant participant = participantRepository
                .findByChatRoomAndMember(room, me)
                .orElseThrow(() -> new IllegalArgumentException("채팅방 참여자가 아닙니다."));

        // 읽음 처리: lastReadAt 갱신
        participant.updateLastReadAt();

        List<ChatMessageResponse> messages = chatMessageRepository
                .findByChatRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 50))
                .stream()
                .map(this::toChatMessageResponse)
                .sorted(Comparator.comparing(ChatMessageResponse::createdAt))
                .toList();

        // TEAM은 otherMember 개념이 없으므로 managerId와 room 정보 반환
        return new ChatRoomDetailResponse(
                room.getId(),
                room.getManagerId(),
                "팀 채팅방",
                StatusType.WORKING,
                messages
        );
    }

    // ── 메시지 전송 (DIRECT / TEAM 공통) ─────────────────────────

    @Transactional
    public ChatMessageResponse sendMessage(Member sender, Long roomId,
                                           SendMessageRequest request) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 채팅방입니다."));

        Member managedSender = memberRepository.findById(sender.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        if (room.getRoomType() == ChatRoomType.DIRECT) {
            if (!room.hasMember(sender.getId())) {
                throw new IllegalArgumentException("채팅방 참여자가 아닙니다.");
            }
        } else {
            if (!participantRepository.existsByChatRoomAndMemberAndActiveTrue(room, managedSender)) {
                throw new IllegalArgumentException("채팅방 참여자가 아닙니다.");
            }
        }

        ChatMessage message = ChatMessage.builder()
                .chatRoom(room)
                .sender(managedSender)
                .content(request.content())
                .messageType(request.messageType())
                .build();
        chatMessageRepository.save(message);

        pushMessageAfterCommit(message, room, sender.getId());

        return toChatMessageResponse(message);
    }

    // ── 읽음 처리 ─────────────────────────────────────────────────

    @Transactional
    public void markAsRead(Member me, Long roomId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 채팅방입니다."));

        if (room.getRoomType() == ChatRoomType.DIRECT) {
            if (!room.hasMember(me.getId())) {
                throw new IllegalArgumentException("채팅방 참여자가 아닙니다.");
            }
            chatMessageRepository.markAllAsReadInDirectRoom(room, me.getId());
            notifyReadAfterCommit(room, me.getId(), room.getOtherMemberId(me.getId()));

        } else {
            ChatRoomParticipant participant = participantRepository
                    .findByChatRoomAndMember(room, me)
                    .orElseThrow(() -> new IllegalArgumentException("채팅방 참여자가 아닙니다."));
            participant.updateLastReadAt();
        }
    }

    // ── 상태 배너 ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ReceiverStatusBannerResponse getReceiverStatusBanner(Member me, Long otherMemberId) {
        Member other = memberRepository.findById(otherMemberId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 사용자입니다."));

        StatusType status = getStatus(other);
        boolean showBanner = (status == StatusType.MEETING || status == StatusType.AWAY);

        String bannerMessage = null;
        if (showBanner) {
            String label = status == StatusType.MEETING ? "회의 중" : "휴식/자리비움 상태";
            bannerMessage = "현재 " + other.getUsername() + "님은 " + label + "입니다. 알림이 울리지 않습니다.";
        }

        return new ReceiverStatusBannerResponse(
                other.getId(), other.getUsername(), status,
                showBanner, true, bannerMessage
        );
    }

    // ── 팀 참가 시 채팅방 처리 ────────────────────────────────────

    /**
     * 팀 참가 시:
     * 1. 매니저와의 1:1 DIRECT 채팅방 자동 생성
     * 2. 팀 TEAM 채팅방 생성 또는 참여자로 추가
     */
    @Transactional
    public void addParticipantToTeamRoom(Long managerId, Member employee) {
        // 1. DIRECT 채팅방 생성
        findOrCreateDirectRoom(managerId, employee.getId());

        // 2. TEAM 채팅방 생성 또는 참여자 추가
        Member manager = memberRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 매니저입니다."));

        ChatRoom teamRoom = chatRoomRepository
                .findByManagerIdAndRoomType(managerId, ChatRoomType.TEAM)
                .orElseGet(() -> {
                    // 팀 채팅방이 없으면 생성 + 매니저를 참여자로 추가
                    ChatRoom newRoom = chatRoomRepository.save(
                            ChatRoom.teamBuilder().managerId(managerId).roomType(ChatRoomType.TEAM).build()
                    );
                    participantRepository.save(
                            ChatRoomParticipant.builder().chatRoom(newRoom).member(manager).build()
                    );
                    return newRoom;
                });

        // 이미 참여 중이 아닌 경우에만 추가
        if (!participantRepository.existsByChatRoomAndMemberAndActiveTrue(teamRoom, employee)) {
            participantRepository.save(
                    ChatRoomParticipant.builder().chatRoom(teamRoom).member(employee).build()
            );
        }
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private ChatRoom findOrCreateDirectRoom(Long myId, Long otherId) {
        long small = Math.min(myId, otherId);
        long big   = Math.max(myId, otherId);

        return chatRoomRepository.findDirectRoom(small, big)
                .orElseGet(() -> chatRoomRepository.save(
                        ChatRoom.directBuilder().member1Id(small).member2Id(big).build()
                ));
    }

    /** DIRECT/TEAM 구분해서 WebSocket 푸시 */
    private void pushMessageAfterCommit(ChatMessage message, ChatRoom room, Long senderId) {
        ChatMessagePayload payload = new ChatMessagePayload(
                room.getId(),
                message.getId(),
                message.getSender().getId(),
                message.getSender().getUsername(),
                message.getContent(),
                message.getMessageType(),
                message.getCreatedAt()
        );

        String event = message.isUrgent()
                ? WsEnvelope.Event.CHAT_URGENT_RECEIVED
                : WsEnvelope.Event.CHAT_MESSAGE_RECEIVED;

        WsEnvelope envelope = WsEnvelope.of(event, payload);

        if (room.getRoomType() == ChatRoomType.DIRECT) {
            Long receiverId = room.getOtherMemberId(senderId);
            StatusType receiverStatus = getStatusById(receiverId);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messagingTemplate.convertAndSend("/topic/members/" + receiverId, envelope);
                    log.info("DIRECT pushed: event={}, receiverId={}, status={}", event, receiverId, receiverStatus);
                }
            });
        } else {
            // TEAM: 발신자 제외 전체 참여자에게 푸시
            List<Long> receiverIds = participantRepository
                    .findByChatRoomAndActiveTrue(room)
                    .stream()
                    .map(p -> p.getMember().getId())
                    .filter(id -> !id.equals(senderId))
                    .toList();

            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    receiverIds.forEach(id ->
                            messagingTemplate.convertAndSend("/topic/members/" + id, envelope));
                    log.info("TEAM pushed: event={}, receiverCount={}", event, receiverIds.size());
                }
            });
        }
    }

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

    private void validateSameTeam(Member me, Member other) {
        boolean isSameTeam =
                me.getId().equals(other.getManagerId()) ||
                        other.getId().equals(me.getManagerId()) ||
                        (me.getManagerId() != null && me.getManagerId().equals(other.getManagerId()));

        if (!isSameTeam) {
            throw new IllegalArgumentException("같은 팀 멤버에게만 메시지를 보낼 수 있습니다.");
        }
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
        String otherUsername;
        StatusType otherStatus;
        Long otherId;

        if (room.getRoomType() == ChatRoomType.DIRECT) {
            otherId = room.getOtherMemberId(myId);
            Member other = memberRepository.findById(otherId).orElse(null);
            otherUsername = other != null ? other.getUsername() : "(알 수 없음)";
            otherStatus   = other != null ? getStatus(other) : StatusType.OFFLINE;
        } else {
            // TEAM: 상대방 개념 없음 — managerId와 "팀 채팅방" 표시
            otherId       = room.getManagerId();
            otherUsername = "팀 채팅방";
            otherStatus   = StatusType.WORKING;
        }

        ChatMessageResponse lastMsg = chatMessageRepository
                .findFirstByChatRoomOrderByCreatedAtDesc(room)
                .map(this::toChatMessageResponse)
                .orElse(null);

        long unread = room.getRoomType() == ChatRoomType.DIRECT
                ? chatMessageRepository.countUnreadDirect(room, myId)
                : participantRepository.countUnreadTeamMessages(room, myId);

        return new ChatRoomResponse(room.getId(), otherId, otherUsername, otherStatus, lastMsg, unread);
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