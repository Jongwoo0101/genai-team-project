package com.worksight.api.service;

import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.dto.WorkLogDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.MemberStatus;
import com.worksight.api.entity.WorkLog;
import com.worksight.api.enums.StatusType;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.MemberStatusRepository;
import com.worksight.api.repository.WorkLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkLogService {

    private final WorkLogRepository workLogRepository;
    private final MemberStatusRepository memberStatusRepository;
    private final MemberRepository memberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ClockInResponse clockIn(Member member) {
        LocalDate today = LocalDate.now();

        workLogRepository.findByMemberAndWorkDate(member, today)
                .ifPresent(w -> {
                    throw new IllegalStateException("이미 오늘 출근하셨습니다.");
                });

        Member managed = memberRepository.findById(member.getId()).orElseThrow();

        WorkLog workLog = WorkLog.builder()
                .member(managed)
                .workDate(today)
                .clockInTime(LocalDateTime.now())
                .build();
        workLogRepository.save(workLog);

        updateMemberStatus(managed, StatusType.WORKING);

        log.info("Clock-in: memberId={}, time={}", managed.getId(), workLog.getClockInTime());

        broadcastAfterCommit(managed, StatusType.WORKING);

        return new ClockInResponse(
                workLog.getId(),
                managed.getId(),
                managed.getUsername(),
                workLog.getWorkDate(),
                workLog.getClockInTime()
        );
    }

    @Transactional
    public ClockOutResponse clockOut(Member member) {
        LocalDate today = LocalDate.now();

        Member managed = memberRepository.findById(member.getId()).orElseThrow();

        WorkLog workLog = workLogRepository.findByMemberAndWorkDate(managed, today)
                .orElseThrow(() -> new IllegalStateException("오늘 출근 기록이 없습니다."));

        if (workLog.isClockedOut()) {
            throw new IllegalStateException("이미 퇴근 처리가 완료되었습니다.");
        }

        workLog.clockOut(LocalDateTime.now());
        updateMemberStatus(managed, StatusType.OFFLINE);

        log.info("Clock-out: memberId={}, time={}", managed.getId(), workLog.getClockOutTime());

        broadcastAfterCommit(managed, StatusType.OFFLINE);

        return new ClockOutResponse(
                workLog.getId(),
                managed.getId(),
                managed.getUsername(),
                workLog.getWorkDate(),
                workLog.getClockInTime(),
                workLog.getClockOutTime()
        );
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private void updateMemberStatus(Member member, StatusType statusType) {
        MemberStatus status = memberStatusRepository.findByMember(member)
                .orElseGet(() -> MemberStatus.builder()
                        .member(member)
                        .statusType(statusType)
                        .build());

        status.updateStatus(statusType);
        memberStatusRepository.save(status);
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
                } else {
                    messagingTemplate.convertAndSend("/topic/members/" + member.getId(), envelope);
                }
            }
        });
    }
}