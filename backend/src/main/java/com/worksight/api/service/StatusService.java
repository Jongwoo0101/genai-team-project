package com.worksight.api.service;

import com.worksight.api.dto.MemberStatusDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.dto.WorkLogDto.TeamStatusPayload;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.MemberStatus;
import com.worksight.api.enums.StatusType;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.MemberStatusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StatusService {

    private final MemberStatusRepository memberStatusRepository;
    private final MemberRepository memberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * AI 캠 분석 결과 상태 업데이트
     * 허용: WORKING / AWAY / FOCUS
     * 불허: MEETING (미팅룸 입장 시 자동), OFFLINE (퇴근 시 자동)
     */
    @Transactional
    public StatusUpdateResponse updateAiStatus(Member member, AiStatusUpdateRequest request) {
        StatusType requested = request.statusType();

        if (requested == StatusType.MEETING) {
            throw new IllegalArgumentException("MEETING 상태는 미팅룸 입장 시 자동으로 변경됩니다.");
        }
        if (requested == StatusType.OFFLINE) {
            throw new IllegalArgumentException("OFFLINE 상태는 퇴근 시 자동으로 변경됩니다.");
        }

        return applyStatusUpdate(member, requested);
    }

    /**
     * 사용자 수동 상태 설정 — FOCUS 만 허용
     */
    @Transactional
    public StatusUpdateResponse updateManualStatus(Member member, ManualStatusUpdateRequest request) {
        if (request.statusType() != StatusType.FOCUS) {
            throw new IllegalArgumentException("수동 설정은 FOCUS 상태만 가능합니다.");
        }
        return applyStatusUpdate(member, request.statusType());
    }

    /**
     * 팀 전체 상태 조회 (MANAGER 전용)
     */
    @Transactional(readOnly = true)
    public List<TeamMemberStatusResponse> getTeamStatus(Long managerId, Member manager) {
        if (!manager.getId().equals(managerId)) {
            throw new IllegalArgumentException("본인 팀의 상태만 조회할 수 있습니다.");
        }
        return memberStatusRepository.findAllByManagerId(managerId)
                .stream()
                .map(ms -> new TeamMemberStatusResponse(
                        ms.getMember().getId(),
                        ms.getMember().getUsername(),
                        ms.getStatusType(),
                        ms.getUpdatedAt()
                ))
                .toList();
    }

    /**
     * 패키지 내부 공개 — MeetingRoomService 에서 호출
     */
    @Transactional
    public void updateStatusInternal(Member member, StatusType statusType) {
        applyStatusUpdate(member, statusType);
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private StatusUpdateResponse applyStatusUpdate(Member member, StatusType statusType) {
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        MemberStatus status = memberStatusRepository.findByMember(managed)
                .orElseGet(() -> MemberStatus.builder()
                        .member(managed)
                        .statusType(statusType)
                        .build());

        status.updateStatus(statusType);
        memberStatusRepository.save(status);

        log.info("Status updated: memberId={}, status={}", managed.getId(), statusType);

        broadcastAfterCommit(managed, statusType);

        return new StatusUpdateResponse(
                managed.getId(),
                managed.getUsername(),
                statusType,
                status.getUpdatedAt()
        );
    }

    private void broadcastAfterCommit(Member member, StatusType statusType) {
        WsEnvelope envelope = WsEnvelope.of(
                WsEnvelope.Event.STATUS_CHANGED,
                new TeamStatusPayload(member.getId(), member.getUsername(), statusType)
        );

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                String topic = member.getManagerId() != null
                        ? "/topic/team/" + member.getManagerId()
                        : "/topic/members/" + member.getId();

                messagingTemplate.convertAndSend(topic, envelope);
                log.info("Status broadcasted: memberId={}, status={}, topic={}",
                        member.getId(), statusType, topic);
            }
        });
    }
}