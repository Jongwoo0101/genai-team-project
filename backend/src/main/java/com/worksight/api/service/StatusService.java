package com.worksight.api.service;

import com.worksight.api.dto.MemberStatusDto.*;
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

import java.time.LocalDateTime;
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
     * - WORKING / MEETING / BREAK 만 허용
     * - FOCUS 는 사용자 수동 설정 전용이므로 거부
     */
    @Transactional
    public StatusUpdateResponse updateAiStatus(Member member, AiStatusUpdateRequest request) {
        if (request.statusType() == StatusType.FOCUS) {
            throw new IllegalArgumentException("AI는 FOCUS 상태를 설정할 수 없습니다.");
        }
        if (request.statusType() == StatusType.OFFLINE) {
            throw new IllegalArgumentException("AI는 OFFLINE 상태를 설정할 수 없습니다.");
        }
        return applyStatusUpdate(member, request.statusType());
    }

    /**
     * 사용자 수동 상태 설정
     * - FOCUS 만 허용
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

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private StatusUpdateResponse applyStatusUpdate(Member member, StatusType statusType) {
        // @AuthenticationPrincipal 객체는 영속성 컨텍스트 밖 → DB 재조회
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

        // 커밋 후 팀 전체 브로드캐스트
        broadcastAfterCommit(managed, statusType);

        return new StatusUpdateResponse(
                managed.getId(),
                managed.getUsername(),
                statusType,
                status.getUpdatedAt()
        );
    }

    /**
     * 트랜잭션 커밋 후 WebSocket 브로드캐스트
     * - /topic/team/{managerId} 로 전송
     * - 팀 미소속 시 개인 토픽으로 폴백
     */
    private void broadcastAfterCommit(Member member, StatusType statusType) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                String topic = member.getManagerId() != null
                        ? "/topic/team/" + member.getManagerId()
                        : "/topic/members/" + member.getId();

                messagingTemplate.convertAndSend(topic, new TeamMemberStatusResponse(
                        member.getId(),
                        member.getUsername(),
                        statusType,
                        LocalDateTime.now()
                ));

                log.info("Status broadcasted: memberId={}, status={}, topic={}",
                        member.getId(), statusType, topic);
            }
        });
    }
}
