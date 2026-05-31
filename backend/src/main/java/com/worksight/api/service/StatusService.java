package com.worksight.api.service;

import com.worksight.api.dto.MemberStatusDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.dto.WorkLogDto.TeamStatusPayload;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.MemberStatus;
import com.worksight.api.entity.Team;
import com.worksight.api.enums.Role;
import com.worksight.api.enums.StatusType;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.MemberStatusRepository;
import com.worksight.api.repository.TeamRepository;
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
    private final TeamRepository teamRepository; // 추가
    private final SimpMessagingTemplate messagingTemplate;

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

    @Transactional
    public StatusUpdateResponse updateManualStatus(Member member, ManualStatusUpdateRequest request) {
        if (request.statusType() != StatusType.FOCUS) {
            throw new IllegalArgumentException("수동 설정은 FOCUS 상태만 가능합니다.");
        }
        return applyStatusUpdate(member, request.statusType());
    }

    /**
     * 팀 전체 상태 조회 (MANAGER/EMPLOYEE 공통으로 사용할 경우 teamId 파라미터 필요)
     */
    @Transactional(readOnly = true)
    public List<TeamMemberStatusResponse> getTeamStatus(Long teamId, Member member) {
        Member managed = memberRepository.findById(member.getId()).orElseThrow();

        // 본인 팀인지 검증
        if (managed.getTeam() == null || !managed.getTeam().getId().equals(teamId)) {
            // 매니저인 경우, 본인이 소유한 팀인지 한번 더 확인
            if (managed.getRole() == Role.MANAGER) {
                Team team = teamRepository.findById(teamId).orElseThrow();
                if (!team.getManager().getId().equals(managed.getId())) {
                    throw new IllegalArgumentException("본인 팀의 상태만 조회할 수 있습니다.");
                }
            } else {
                throw new IllegalArgumentException("본인 소속 팀의 상태만 조회할 수 있습니다.");
            }
        }

        return memberStatusRepository.findAllByTeamId(teamId)
                .stream()
                .map(ms -> new TeamMemberStatusResponse(
                        ms.getMember().getId(),
                        ms.getMember().getUsername(),
                        ms.getStatusType(),
                        ms.getUpdatedAt()
                ))
                .toList();
    }

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
                if (member.getTeam() != null) {
                    messagingTemplate.convertAndSend("/topic/team/" + member.getTeam().getId(), envelope);
                    log.info("Status broadcasted: memberId={}, status={}, topic=/topic/team/{}",
                            member.getId(), statusType, member.getTeam().getId());
                } else {
                    // 팀이 없다면 개인 채널로 폴백
                    messagingTemplate.convertAndSend("/topic/members/" + member.getId(), envelope);
                }
            }
        });
    }
}