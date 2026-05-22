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

        WorkLog workLog = WorkLog.builder()
                .member(member)
                .workDate(today)
                .clockInTime(LocalDateTime.now())
                .build();
        workLogRepository.save(workLog);

        updateMemberStatus(member, StatusType.WORKING);

        log.info("Clock-in: memberId={}, time={}", member.getId(), workLog.getClockInTime());

        broadcastAfterCommit(member, StatusType.WORKING);

        return new ClockInResponse(
                workLog.getId(),
                member.getId(),
                member.getUsername(),
                workLog.getWorkDate(),
                workLog.getClockInTime()
        );
    }

    @Transactional
    public ClockOutResponse clockOut(Member member) {
        LocalDate today = LocalDate.now();

        WorkLog workLog = workLogRepository.findByMemberAndWorkDate(member, today)
                .orElseThrow(() -> new IllegalStateException("오늘 출근 기록이 없습니다."));

        if (workLog.isClockedOut()) {
            throw new IllegalStateException("이미 퇴근 처리가 완료되었습니다.");
        }

        workLog.clockOut(LocalDateTime.now());
        updateMemberStatus(member, StatusType.OFFLINE);

        log.info("Clock-out: memberId={}, time={}", member.getId(), workLog.getClockOutTime());

        broadcastAfterCommit(member, StatusType.OFFLINE);

        return new ClockOutResponse(
                workLog.getId(),
                member.getId(),
                member.getUsername(),
                workLog.getWorkDate(),
                workLog.getClockInTime(),
                workLog.getClockOutTime()
        );
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private void updateMemberStatus(Member member, StatusType statusType) {
        Member managed = memberRepository.findById(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        MemberStatus status = memberStatusRepository.findByMember(managed)
                .orElseGet(() -> MemberStatus.builder()
                        .member(managed)
                        .statusType(statusType)
                        .build());

        status.updateStatus(statusType);
        memberStatusRepository.save(status);
    }

    private void broadcastAfterCommit(Member member, StatusType statusType) {
        // WsEnvelope 표준 구조로 발신
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
                log.info("Broadcasted status: memberId={}, status={}, topic={}",
                        member.getId(), statusType, topic);
            }
        });
    }
}