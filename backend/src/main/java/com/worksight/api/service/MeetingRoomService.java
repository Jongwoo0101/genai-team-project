package com.worksight.api.service;

import com.worksight.api.dto.MeetingRoomDto.*;
import com.worksight.api.entity.MeetingParticipant;
import com.worksight.api.entity.MeetingRoom;
import com.worksight.api.entity.Member;
import com.worksight.api.enums.MeetingRequestStatus;
import com.worksight.api.enums.StatusType;
import com.worksight.api.repository.MeetingParticipantRepository;
import com.worksight.api.repository.MeetingRoomRepository;
import com.worksight.api.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Slf4j
@Service
@RequiredArgsConstructor
public class MeetingRoomService {

    private final MeetingRoomRepository meetingRoomRepository;
    private final MeetingParticipantRepository participantRepository;
    private final MemberRepository memberRepository;
    private final StatusService statusService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 미팅룸 생성
     * - 주최자가 이미 진행 중인 회의방이 있으면 생성 불가
     * - 생성 시 주최자 상태 → MEETING 자동 변경
     * - 팀 전체에 새 미팅룸 생성 알림 브로드캐스트
     */
    @Transactional
    public MeetingRoomResponse createRoom(Member host, CreateMeetingRoomRequest request) {
        Member managedHost = memberRepository.findById(host.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        if (meetingRoomRepository.existsByHostAndActiveTrue(managedHost)) {
            throw new IllegalStateException("이미 진행 중인 회의방이 있습니다.");
        }

        MeetingRoom room = MeetingRoom.builder()
                .title(request.title())
                .host(managedHost)
                .build();
        meetingRoomRepository.save(room);

        // 주최자 자신을 ACCEPTED 참가자로 등록
        MeetingParticipant hostParticipant = MeetingParticipant.builder()
                .meetingRoom(room)
                .member(managedHost)
                .requestStatus(MeetingRequestStatus.ACCEPTED)
                .invited(false)
                .build();
        participantRepository.save(hostParticipant);

        // 주최자 상태 → MEETING
        statusService.updateStatusInternal(managedHost, StatusType.MEETING);

        // 팀 전체 브로드캐스트
        broadcastRoomEvent(managedHost, room, "ROOM_CREATED");

        log.info("MeetingRoom created: roomId={}, host={}", room.getId(), managedHost.getUsername());

        return toResponse(room, 1);
    }

    /**
     * 진행 중인 미팅룸 목록 조회 (팀 기준)
     */
    @Transactional(readOnly = true)
    public List<MeetingRoomResponse> getActiveRooms(Member member) {
        Long managerId = member.getManagerId() != null
                ? member.getManagerId()
                : member.getId();

        return meetingRoomRepository.findActiveRoomsByManagerId(managerId)
                .stream()
                .map(room -> toResponse(room,
                        participantRepository.countByMeetingRoomAndRequestStatus(
                                room, MeetingRequestStatus.ACCEPTED)))
                .toList();
    }

    /**
     * 미팅룸 상세 조회
     */
    @Transactional(readOnly = true)
    public MeetingRoomDetailResponse getRoomDetail(Long roomId) {
        MeetingRoom room = findActiveRoom(roomId);
        List<ParticipantInfo> participants = participantRepository
                .findAllByMeetingRoom(room)
                .stream()
                .map(p -> new ParticipantInfo(
                        p.getMember().getId(),
                        p.getMember().getUsername(),
                        p.getRequestStatus(),
                        p.isInvited()
                ))
                .toList();

        return new MeetingRoomDetailResponse(
                room.getId(),
                room.getTitle(),
                room.getHost().getId(),
                room.getHost().getUsername(),
                room.isActive(),
                participants,
                room.getCreatedAt()
        );
    }

    /**
     * 참가 요청 (사용자 → 주최자)
     * - 이미 요청/참여 중이면 불가
     * - 주최자에게 WebSocket 알림 전송
     */
    @Transactional
    public MeetingRequestResponse requestJoin(Long roomId, Member member) {
        MeetingRoom room = findActiveRoom(roomId);
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        if (participantRepository.existsByMeetingRoomAndMember(room, managed)) {
            throw new IllegalStateException("이미 참가 요청하셨거나 회의에 참여 중입니다.");
        }

        MeetingParticipant participant = MeetingParticipant.builder()
                .meetingRoom(room)
                .member(managed)
                .requestStatus(MeetingRequestStatus.PENDING)
                .invited(false)
                .build();
        participantRepository.save(participant);

        // 주최자에게 참가 요청 알림
        notifyHostAfterCommit(room, managed, "JOIN_REQUESTED");

        log.info("Join requested: roomId={}, member={}", roomId, managed.getUsername());

        return toRequestResponse(participant);
    }

    /**
     * 주최자 초대 (주최자 → 특정 사용자)
     * - 초대 대상에게 WebSocket 알림 전송
     */
    @Transactional
    public MeetingRequestResponse inviteMember(Long roomId, Member host, InviteMemberRequest request) {
        MeetingRoom room = findActiveRoom(roomId);
        validateHost(room, host);

        Member invitee = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 회원입니다."));

        if (participantRepository.existsByMeetingRoomAndMember(room, invitee)) {
            throw new IllegalStateException("이미 참가 요청하셨거나 회의에 참여 중입니다.");
        }

        MeetingParticipant participant = MeetingParticipant.builder()
                .meetingRoom(room)
                .member(invitee)
                .requestStatus(MeetingRequestStatus.PENDING)
                .invited(true)
                .build();
        participantRepository.save(participant);

        // 초대 대상에게 알림
        notifyMemberAfterCommit(invitee, room, "INVITED");

        log.info("Member invited: roomId={}, invitee={}", roomId, invitee.getUsername());

        return toRequestResponse(participant);
    }

    /**
     * 참가 요청 수락/거절 (주최자가 처리)
     * - 수락 시 해당 멤버 상태 → MEETING 자동 변경
     */
    @Transactional
    public MeetingRequestResponse respondToRequest(Long roomId, Long participantId,
                                                    Member host, RespondToRequestRequest request) {
        MeetingRoom room = findActiveRoom(roomId);
        validateHost(room, host);

        MeetingParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 참가 요청입니다."));

        if (request.accept()) {
            participant.accept();
            // 수락된 멤버 상태 → MEETING
            statusService.updateStatusInternal(participant.getMember(), StatusType.MEETING);
            notifyMemberAfterCommit(participant.getMember(), room, "REQUEST_ACCEPTED");
        } else {
            participant.reject();
            notifyMemberAfterCommit(participant.getMember(), room, "REQUEST_REJECTED");
        }

        log.info("Request responded: roomId={}, participantId={}, accepted={}",
                roomId, participantId, request.accept());

        return toRequestResponse(participant);
    }

    /**
     * 초대 수락/거절 (초대받은 사용자가 처리)
     * - 수락 시 해당 멤버 상태 → MEETING 자동 변경
     */
    @Transactional
    public MeetingRequestResponse respondToInvite(Long roomId, Member member,
                                                   RespondToRequestRequest request) {
        MeetingRoom room = findActiveRoom(roomId);
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        MeetingParticipant participant = participantRepository
                .findByMeetingRoomAndMember(room, managed)
                .orElseThrow(() -> new NoSuchElementException("초대 정보를 찾을 수 없습니다."));

        if (!participant.isInvited()) {
            throw new IllegalStateException("초대받은 요청이 아닙니다.");
        }

        if (request.accept()) {
            participant.accept();
            statusService.updateStatusInternal(managed, StatusType.MEETING);
            broadcastRoomEvent(managed, room, "MEMBER_JOINED");
        } else {
            participant.reject();
        }

        return toRequestResponse(participant);
    }

    /**
     * 미팅룸 종료 (주최자만 가능)
     * - 모든 참가자 상태 → WORKING 으로 복귀
     * - 팀 전체에 종료 알림 브로드캐스트
     */
    @Transactional
    public void endRoom(Long roomId, Member host) {
        MeetingRoom room = findActiveRoom(roomId);
        validateHost(room, host);

        room.end();

        // 수락된 모든 참가자 상태 → WORKING 복귀
        participantRepository.findAllByMeetingRoomAndRequestStatus(room, MeetingRequestStatus.ACCEPTED)
                .forEach(p -> statusService.updateStatusInternal(p.getMember(), StatusType.WORKING));

        broadcastRoomEvent(host, room, "ROOM_ENDED");

        log.info("MeetingRoom ended: roomId={}, host={}", roomId, host.getUsername());
    }

    /**
     * 회의 나가기 (참가자)
     * - 나간 참가자 상태 → WORKING 복귀
     */
    @Transactional
    public void leaveRoom(Long roomId, Member member) {
        MeetingRoom room = findActiveRoom(roomId);
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        MeetingParticipant participant = participantRepository
                .findByMeetingRoomAndMember(room, managed)
                .orElseThrow(() -> new NoSuchElementException("회의 참가 정보를 찾을 수 없습니다."));

        participant.reject(); // REJECTED = 나간 상태로 표시
        statusService.updateStatusInternal(managed, StatusType.WORKING);

        broadcastRoomEvent(managed, room, "MEMBER_LEFT");

        log.info("Member left: roomId={}, member={}", roomId, managed.getUsername());
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private MeetingRoom findActiveRoom(Long roomId) {
        MeetingRoom room = meetingRoomRepository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 미팅룸입니다."));
        if (!room.isActive()) {
            throw new IllegalStateException("이미 종료된 미팅룸입니다.");
        }
        return room;
    }

    private void validateHost(MeetingRoom room, Member host) {
        if (!room.getHost().getId().equals(host.getId())) {
            throw new IllegalArgumentException("주최자만 가능한 작업입니다.");
        }
    }

    /** 팀 전체 브로드캐스트 (/topic/team/{managerId}) */
    private void broadcastRoomEvent(Member member, MeetingRoom room, String eventType) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                Long managerId = member.getManagerId() != null
                        ? member.getManagerId()
                        : member.getId();

                messagingTemplate.convertAndSend(
                        "/topic/team/" + managerId,
                        Map.of(
                                "type", eventType,
                                "roomId", room.getId(),
                                "title", room.getTitle(),
                                "hostId", room.getHost().getId()
                        )
                );
            }
        });
    }

    /** 주최자에게 개인 알림 (/topic/members/{hostId}) */
    private void notifyHostAfterCommit(MeetingRoom room, Member requester, String eventType) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend(
                        "/topic/members/" + room.getHost().getId(),
                        Map.of(
                                "type", eventType,
                                "roomId", room.getId(),
                                "memberId", requester.getId(),
                                "username", requester.getUsername()
                        )
                );
            }
        });
    }

    /** 특정 멤버에게 개인 알림 (/topic/members/{memberId}) */
    private void notifyMemberAfterCommit(Member member, MeetingRoom room, String eventType) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend(
                        "/topic/members/" + member.getId(),
                        Map.of(
                                "type", eventType,
                                "roomId", room.getId(),
                                "title", room.getTitle()
                        )
                );
            }
        });
    }

    private MeetingRoomResponse toResponse(MeetingRoom room, int participantCount) {
        return new MeetingRoomResponse(
                room.getId(),
                room.getTitle(),
                room.getHost().getId(),
                room.getHost().getUsername(),
                room.isActive(),
                participantCount,
                room.getCreatedAt()
        );
    }

    private MeetingRequestResponse toRequestResponse(MeetingParticipant p) {
        return new MeetingRequestResponse(
                p.getId(),
                p.getMeetingRoom().getId(),
                p.getMember().getId(),
                p.getMember().getUsername(),
                p.getRequestStatus()
        );
    }
}
