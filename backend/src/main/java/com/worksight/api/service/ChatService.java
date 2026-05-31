package com.worksight.api.service;

import com.worksight.api.dto.ChatDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.*;
import com.worksight.api.enums.ChatRoomType;
import com.worksight.api.enums.StatusType;
import com.worksight.api.exception.ResourceNotFoundException;
import com.worksight.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final TeamRepository teamRepository;
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
                        r -> r.lastMessage() != null
                                ? r.lastMessage().createdAt() : java.time.LocalDateTime.MIN,
                        Comparator.reverseOrder()))
                .toList();
    }

    // ── DIRECT 채팅방 입장 ────────────────────────────────────────

    @Transactional
    public ChatRoomDetailResponse enterRoom(Member me, Long otherMemberId) {
        Member other = memberRepository.findById(otherMemberId)
                .orElseThrow(() -> ResourceNotFoundException.member(otherMemberId));

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
                .orElseThrow(() -> ResourceNotFoundException.chatRoom(roomId));

        if (room.getRoomType() != ChatRoomType.TEAM) {
            throw new IllegalArgumentException("팀 채팅방이 아닙니다.");
        }

        ChatRoomParticipant participant = participantRepository
                .findByChatRoomAndMember(room, me)
                .orElseThrow(() -> new IllegalArgumentException("채팅방 참여자가 아닙니다."));

        participant.updateLastReadAt();

        List<ChatMessageResponse> messages = chatMessageRepository
                .findByChatRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 50))
                .stream()
                .map(this::toChatMessageResponse)
                .sorted(Comparator.comparing(ChatMessageResponse::createdAt))
                .toList();

        // TEAM 채팅방은 "상대방" 개념 없음 — teamId를 대표 ID로 반환
        // otherMemberStatus를 null 허용하거나 별도 DTO 분리를 권장 (4-2 개선 참고)
        return new ChatRoomDetailResponse(
                room.getId(),
                room.getTeamId(),
                "팀 채팅방",
                null,           // TEAM은 otherMemberStatus 없음 — DTO에서 @Nullable 처리 필요
                messages
        );
    }

    // ── 메시지 전송 ───────────────────────────────────────────────

    @Transactional
    public ChatMessageResponse sendMessage(Member sender, Long roomId,
                                           SendMessageRequest request) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> ResourceNotFoundException.chatRoom(roomId));

        Member managedSender = memberRepository.findById(sender.getId())
                .orElseThrow(() -> ResourceNotFoundException.member(sender.getId()));

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
                .orElseThrow(() -> ResourceNotFoundException.chatRoom(roomId));

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
                .orElseThrow(() -> ResourceNotFoundException.member(otherMemberId));

        StatusType status = getStatus(other);
        boolean showBanner = (status == StatusType.MEETING || status == StatusType.AWAY);

        String bannerMessage = null;
        if (showBanner) {
            String label = status == StatusType.MEETING ? "회의 중" : "휴식/자리비움 상태";
            bannerMessage = "현재 " + other.getUsername() + "님은 " + label
                    + "입니다. 알림이 울리지 않습니다.";
        }

        return new ReceiverStatusBannerResponse(
                other.getId(), other.getUsername(), status,
                showBanner, true, bannerMessage
        );
    }

    // ── 팀 참가 시 채팅방 처리 ────────────────────────────────────

    @Transactional
    public void addParticipantToTeamRoom(Long teamId, Member employee) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> ResourceNotFoundException.team(teamId));
        Member manager = team.getManager();

        // 1. DIRECT 채팅방 (매니저 ↔ 직원) 생성
        findOrCreateDirectRoom(manager.getId(), employee.getId());

        // 2. TEAM 채팅방 생성 또는 참여자 추가
        ChatRoom teamRoom = chatRoomRepository
                .findByTeamIdAndRoomType(teamId, ChatRoomType.TEAM)
                .orElseGet(() -> {
                    ChatRoom newRoom = chatRoomRepository.save(
                            ChatRoom.teamBuilder().teamId(teamId).roomType(ChatRoomType.TEAM).build()
                    );
                    // 팀 채팅방 최초 생성 시 매니저를 참여자로 추가
                    participantRepository.save(
                            ChatRoomParticipant.builder().chatRoom(newRoom).member(manager).build()
                    );
                    return newRoom;
                });

        // [개선 2-2] ChatRoomParticipant 유니크 제약(uq_participant)과 함께 이중 방어
        // existsBy 체크 후 save 사이 gap에서 중복 INSERT 발생 가능
        // → DataIntegrityViolationException 은 GlobalExceptionHandler에서 처리
        if (!participantRepository.existsByChatRoomAndMemberAndActiveTrue(teamRoom, employee)) {
            try {
                participantRepository.save(
                        ChatRoomParticipant.builder().chatRoom(teamRoom).member(employee).build()
                );
            } catch (DataIntegrityViolationException e) {
                log.warn("ChatRoomParticipant 중복 INSERT 무시: teamRoomId={}, memberId={}",
                        teamRoom.getId(), employee.getId());
            }
        }
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    /**
     * DIRECT 채팅방 중복 생성 race condition 방어
     * DB 유니크 제약(uq_direct_room)과 함께 이중 방어
     * 중복 INSERT 시 DataIntegrityViolationException → 기존 방 재조회
     */
    private ChatRoom findOrCreateDirectRoom(Long myId, Long otherId) {
        long small = Math.min(myId, otherId);
        long big   = Math.max(myId, otherId);

        return chatRoomRepository.findDirectRoom(small, big)
                .orElseGet(() -> {
                    try {
                        return chatRoomRepository.save(
                                ChatRoom.directBuilder().member1Id(small).member2Id(big).build()
                        );
                    } catch (DataIntegrityViolationException e) {
                        // 동시 요청으로 중복 INSERT 발생 시 이미 만들어진 방 재조회
                        return chatRoomRepository.findDirectRoom(small, big)
                                .orElseThrow(() -> new IllegalStateException(
                                        "채팅방 생성 중 오류가 발생했습니다."));
                    }
                });
    }

    private void pushMessageAfterCommit(ChatMessage message, ChatRoom room, Long senderId) {
        ChatMessagePayload payload = new ChatMessagePayload(
                room.getId(), message.getId(),
                message.getSender().getId(), message.getSender().getUsername(),
                message.getContent(), message.getMessageType(), message.getCreatedAt()
        );

        String event = message.isUrgent()
                ? WsEnvelope.Event.CHAT_URGENT_RECEIVED
                : WsEnvelope.Event.CHAT_MESSAGE_RECEIVED;

        WsEnvelope envelope = WsEnvelope.of(event, payload);

        if (room.getRoomType() == ChatRoomType.DIRECT) {
            Long receiverId = room.getOtherMemberId(senderId);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messagingTemplate.convertAndSend("/topic/members/" + receiverId, envelope);
                    log.info("DIRECT pushed: event={}, receiverId={}", event, receiverId);
                }
            });
        } else {
            // findByChatRoomAndActiveTrue → Member lazy load N+1 방지
            // findActiveMemberIds: memberId만 SELECT하는 전용 쿼리 사용
            List<Long> receiverIds = participantRepository
                    .findActiveMemberIds(room)
                    .stream()
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
        WsEnvelope envelope = WsEnvelope.of(
                WsEnvelope.Event.CHAT_READ,
                new ChatReadPayload(room.getId(), readByMemberId)
        );
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend("/topic/members/" + notifyMemberId, envelope);
            }
        });
    }

    /**
     * 같은 팀 검증 — Team 엔티티 기반으로 변경
     * 기존: managerId 숫자 비교 → 오류 가능성 있음
     * 개선: DB에서 최신 Member 조회 후 team.id 비교
     */
    private void validateSameTeam(Member me, Member other) {
        Member managedMe    = memberRepository.findById(me.getId())
                .orElseThrow(() -> ResourceNotFoundException.member(me.getId()));
        Member managedOther = memberRepository.findById(other.getId())
                .orElseThrow(() -> ResourceNotFoundException.member(other.getId()));

        Team myTeam    = managedMe.getTeam();
        Team otherTeam = managedOther.getTeam();

        boolean isSameTeam;

        if (myTeam != null && otherTeam != null) {
            // 둘 다 팀이 있는 경우: 같은 팀인지 확인
            isSameTeam = myTeam.getId().equals(otherTeam.getId());
        } else if (myTeam != null) {
            // 내가 팀이 있고 상대방이 없는 경우: 상대방이 내 팀 매니저인지 확인
            isSameTeam = myTeam.getManager().getId().equals(managedOther.getId());
        } else if (otherTeam != null) {
            // 내가 팀이 없고 상대방이 있는 경우: 내가 상대방 팀의 매니저인지 확인
            isSameTeam = otherTeam.getManager().getId().equals(managedMe.getId());
        } else {
            isSameTeam = false;
        }

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
            // [개선 4-3] orElse(null) 대신 orElseThrow — 정상 상태에서 없을 수 없음
            Member other = memberRepository.findById(otherId)
                    .orElseThrow(() -> ResourceNotFoundException.member(otherId));
            otherUsername = other.getUsername();
            otherStatus   = getStatus(other);
        } else {
            otherId       = room.getTeamId();
            otherUsername = "팀 채팅방";
            otherStatus   = null; // TEAM은 상대방 상태 없음
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
                m.getId(), m.getChatRoom().getId(),
                m.getSender().getId(), m.getSender().getUsername(),
                m.getContent(), m.getMessageType(),
                m.isRead(), m.getCreatedAt(), m.getReadAt()
        );
    }
}
