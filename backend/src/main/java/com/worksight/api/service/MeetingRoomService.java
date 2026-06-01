package com.worksight.api.service;

import com.worksight.api.dto.MeetingRoomDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.MeetingParticipant;
import com.worksight.api.entity.MeetingRoom;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.Team;
import com.worksight.api.enums.MeetingRequestStatus;
import com.worksight.api.enums.Role;
import com.worksight.api.enums.StatusType;
import com.worksight.api.repository.MeetingParticipantRepository;
import com.worksight.api.repository.MeetingRoomRepository;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.TeamRepository;
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
    private final TeamRepository teamRepository;
    private final StatusService statusService;
    private final SimpMessagingTemplate messagingTemplate;

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

        MeetingParticipant hostParticipant = MeetingParticipant.builder()
                .meetingRoom(room)
                .member(managedHost)
                .requestStatus(MeetingRequestStatus.ACCEPTED)
                .invited(false)
                .build();
        participantRepository.save(hostParticipant);

        statusService.updateStatusInternal(managedHost, StatusType.MEETING);

        broadcastTeamAfterCommit(managedHost, WsEnvelope.Event.ROOM_CREATED,
                roomPayload(room));

        log.info("MeetingRoom created: roomId={}, host={}", room.getId(), managedHost.getUsername());

        return toResponse(room, 1);
    }

    @Transactional(readOnly = true)
    public List<MeetingRoomResponse> getActiveRooms(Member member, Long requestedTeamId) {
        // 프론트에서 명시적으로 teamId를 넘겨주면 그 팀의 방을 반환
        Long teamId = (requestedTeamId != null) ? requestedTeamId : resolveTeamId(member);

        return meetingRoomRepository.findActiveRoomsByTeamId(teamId)
                .stream()
                .map(room -> toResponse(room,
                        participantRepository.countByMeetingRoomAndRequestStatus(
                                room, MeetingRequestStatus.ACCEPTED)))
                .toList();
    }

    @Transactional(readOnly = true)
    public MeetingRoomDetailResponse getRoomDetail(Long roomId) {
        MeetingRoom room = findActiveRoom(roomId);
        List<ParticipantInfo> participants = participantRepository
                .findAllByMeetingRoom(room)
                .stream()
                .map(p -> new ParticipantInfo(
                        p.getId(),
                        p.getMember().getId(),
                        p.getMember().getUsername(),
                        p.getRequestStatus(),
                        p.isInvited()
                ))
                .toList();

        return new MeetingRoomDetailResponse(
                room.getId(), room.getTitle(),
                room.getHost().getId(), room.getHost().getUsername(),
                room.isActive(), participants, room.getCreatedAt()
        );
    }

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

        notifyMemberAfterCommit(room.getHost(), WsEnvelope.Event.JOIN_REQUESTED,
                Map.of("roomId", room.getId(),
                        "participantId", participant.getId(),
                        "memberId", managed.getId(),
                        "username", managed.getUsername()));

        log.info("Join requested: roomId={}, member={}", roomId, managed.getUsername());
        return toRequestResponse(participant);
    }

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

        notifyMemberAfterCommit(invitee, WsEnvelope.Event.INVITED,
                Map.of("roomId", room.getId(),
                        "participantId", participant.getId(),
                        "memberId", invitee.getId(),
                        "username", invitee.getUsername(),
                        "roomTitle", room.getTitle(),
                        "hostUsername", host.getUsername()));

        log.info("Member invited: roomId={}, invitee={}", roomId, invitee.getUsername());
        return toRequestResponse(participant);
    }

    @Transactional
    public MeetingRequestResponse respondToRequest(Long roomId, Long participantId,
                                                   Member host, RespondToRequestRequest request) {
        MeetingRoom room = findActiveRoom(roomId);
        validateHost(room, host);

        MeetingParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 참가 요청입니다."));

        if (request.accept()) {
            participant.accept();
            statusService.updateStatusInternal(participant.getMember(), StatusType.MEETING);
            notifyMemberAfterCommit(participant.getMember(), WsEnvelope.Event.REQUEST_ACCEPTED,
                    Map.of("roomId", room.getId(),
                            "participantId", participant.getId(),
                            "title", room.getTitle()));
        } else {
            participant.reject();
            notifyMemberAfterCommit(participant.getMember(), WsEnvelope.Event.REQUEST_REJECTED,
                    Map.of("roomId", room.getId(),
                            "participantId", participant.getId(),
                            "title", room.getTitle()));
        }

        return toRequestResponse(participant);
    }

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
            broadcastTeamAfterCommit(managed, WsEnvelope.Event.MEMBER_JOINED,
                    roomPayload(room));
        } else {
            participant.reject();
        }

        return toRequestResponse(participant);
    }

    @Transactional
    public void endRoom(Long roomId, Member host) {
        MeetingRoom room = findActiveRoom(roomId);
        validateHost(room, host);

        room.end();

        participantRepository.findAllByMeetingRoomAndRequestStatus(room, MeetingRequestStatus.ACCEPTED)
                .forEach(p -> statusService.updateStatusInternal(p.getMember(), StatusType.WORKING));

        broadcastTeamAfterCommit(host, WsEnvelope.Event.ROOM_ENDED, roomPayload(room));

        log.info("MeetingRoom ended: roomId={}", roomId);
    }

    @Transactional
    public void leaveRoom(Long roomId, Member member) {
        MeetingRoom room = findActiveRoom(roomId);
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        MeetingParticipant participant = participantRepository
                .findByMeetingRoomAndMember(room, managed)
                .orElseThrow(() -> new NoSuchElementException("회의 참가 정보를 찾을 수 없습니다."));

        participant.reject();
        statusService.updateStatusInternal(managed, StatusType.WORKING);
        broadcastTeamAfterCommit(managed, WsEnvelope.Event.MEMBER_LEFT, roomPayload(room));

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

    private Long resolveTeamId(Member member) {
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        if (managed.getTeam() != null) {
            return managed.getTeam().getId();
        } else if (managed.getRole() == Role.MANAGER) {
            return teamRepository.findFirstByManagerIdOrderByIdDesc(managed.getId())
                    .map(Team::getId)
                    .orElseThrow(() -> new IllegalStateException("운영 중인 팀이 없습니다."));
        }
        throw new IllegalStateException("소속된 팀이 없습니다.");
    }

    private void broadcastTeamAfterCommit(Member member, String event, Object data) {
        WsEnvelope envelope = WsEnvelope.of(event, data);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    Long teamId = resolveTeamId(member);
                    messagingTemplate.convertAndSend("/topic/team/" + teamId, envelope);
                } catch (Exception e) {
                    log.warn("Failed to broadcast team meeting event due to missing team context. memberId={}", member.getId());
                }
            }
        });
    }

    private void notifyMemberAfterCommit(Member member, String event, Object data) {
        WsEnvelope envelope = WsEnvelope.of(event, data);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend("/topic/members/" + member.getId(), envelope);
            }
        });
    }

    private Map<String, Object> roomPayload(MeetingRoom room) {
        return Map.of(
                "roomId", room.getId(),
                "title", room.getTitle(),
                "hostId", room.getHost().getId()
        );
    }

    private MeetingRoomResponse toResponse(MeetingRoom room, int participantCount) {
        return new MeetingRoomResponse(
                room.getId(), room.getTitle(),
                room.getHost().getId(), room.getHost().getUsername(),
                room.isActive(), participantCount, room.getCreatedAt()
        );
    }

    private MeetingRequestResponse toRequestResponse(MeetingParticipant p) {
        return new MeetingRequestResponse(
                p.getId(), p.getMeetingRoom().getId(),
                p.getMember().getId(), p.getMember().getUsername(),
                p.getRequestStatus()
        );
    }
}