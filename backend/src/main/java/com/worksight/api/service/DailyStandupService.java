package com.worksight.api.service;

import com.worksight.api.dto.DailyStandupDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.DailyStandup;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.Team;
import com.worksight.api.enums.Role;
import com.worksight.api.repository.DailyStandupRepository;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DailyStandupService {

    private final DailyStandupRepository dailyStandupRepository;
    private final MemberRepository memberRepository;
    private final TeamRepository teamRepository; // 팀 조회용 추가
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public DailyStandupResponse writeGoal(Member member, WriteGoalRequest request) {
        Member managed = getManagedMember(member);
        LocalDate today = LocalDate.now();

        DailyStandup standup = dailyStandupRepository
                .findByMemberAndStandupDate(managed, today)
                .orElseGet(() -> DailyStandup.builder()
                        .member(managed)
                        .standupDate(today)
                        .goal(request.goal())
                        .build());

        standup.updateGoal(request.goal());
        dailyStandupRepository.save(standup);

        log.info("Goal written: memberId={}, date={}", managed.getId(), today);

        broadcastAfterCommit(managed, WsEnvelope.Event.GOAL_UPDATED, today);

        return toResponse(standup);
    }

    @Transactional
    public DailyStandupResponse writeResult(Member member, WriteResultRequest request) {
        Member managed = getManagedMember(member);
        LocalDate today = LocalDate.now();

        DailyStandup standup = dailyStandupRepository
                .findByMemberAndStandupDate(managed, today)
                .orElseThrow(() -> new IllegalStateException("오늘의 목표를 먼저 작성해주세요."));

        standup.updateResult(request.result());

        log.info("Result written: memberId={}, date={}", managed.getId(), today);

        broadcastAfterCommit(managed, WsEnvelope.Event.RESULT_UPDATED, today);

        return toResponse(standup);
    }

    @Transactional(readOnly = true)
    public DailyStandupResponse getMyStandup(Member member) {
        Member managed = getManagedMember(member);

        DailyStandup standup = dailyStandupRepository
                .findByMemberAndStandupDate(managed, LocalDate.now())
                .orElseThrow(() -> new IllegalStateException("오늘 작성된 스탠드업이 없습니다."));

        return toResponse(standup);
    }

    @Transactional(readOnly = true)
    public TeamStandupResponse getTeamStandup(Member member, LocalDate date, Long requestedTeamId) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        Long teamId = (requestedTeamId != null) ? requestedTeamId : resolveTeamId(member);

        List<DailyStandupResponse> standups = dailyStandupRepository
                .findTeamStandupsByDate(teamId, targetDate)
                .stream()
                .map(this::toResponse)
                .toList();

        return new TeamStandupResponse(targetDate, standups);
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private Member getManagedMember(Member member) {
        return memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
    }

    private Long resolveTeamId(Member member) {
        Member managed = getManagedMember(member);
        if (managed.getTeam() != null) {
            return managed.getTeam().getId();
        } else if (managed.getRole() == Role.MANAGER) {
            return teamRepository.findFirstByManagerIdOrderByIdDesc(managed.getId())
                    .map(Team::getId)
                    .orElseThrow(() -> new IllegalStateException("운영 중인 팀이 없습니다."));
        }
        throw new IllegalStateException("소속된 팀이 없습니다.");
    }

    private void broadcastAfterCommit(Member member, String event, LocalDate date) {
        WsEnvelope envelope = WsEnvelope.of(event, Map.of(
                "memberId", member.getId(),
                "username", member.getUsername(),
                "date", date.toString()
        ));

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    Long teamId = resolveTeamId(member);
                    messagingTemplate.convertAndSend("/topic/team/" + teamId, envelope);
                    log.info("Standup broadcasted: memberId={}, event={}, teamId={}", member.getId(), event, teamId);
                } catch (Exception e) {
                    log.warn("Failed to broadcast standup due to missing team context. memberId={}", member.getId());
                }
            }
        });
    }

    private DailyStandupResponse toResponse(DailyStandup ds) {
        return new DailyStandupResponse(
                ds.getId(), ds.getMember().getId(), ds.getMember().getUsername(),
                ds.getStandupDate(), ds.getGoal(), ds.getResult(),
                ds.getCreatedAt(), ds.getUpdatedAt()
        );
    }
}
