package com.worksight.api.service;

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

    /**
     * 업무 시작 (출근)
     * 1. 당일 중복 출근 방지
     * 2. WorkLog 생성
     * 3. MemberStatus → WORKING 으로 upsert
     * 4. 트랜잭션 커밋 후 팀 전체에 WebSocket 브로드캐스트
     */
    @Transactional
    public ClockInResponse clockIn(Member member) {
        LocalDate today = LocalDate.now();

        // 이미 출근한 경우 방지
        workLogRepository.findByMemberAndWorkDate(member, today)
                .ifPresent(w -> {
                    throw new IllegalStateException("이미 오늘 출근하셨습니다.");
                });

        // WorkLog 생성
        WorkLog workLog = WorkLog.builder()
                .member(member)
                .workDate(today)
                .clockInTime(LocalDateTime.now())
                .build();
        workLogRepository.save(workLog);

        // MemberStatus upsert → WORKING
        updateMemberStatus(member, StatusType.WORKING);

        log.info("Clock-in: memberId={}, time={}", member.getId(), workLog.getClockInTime());

        // 커밋 후 팀 전체 브로드캐스트
        broadcastAfterCommit(member, StatusType.WORKING);

        return new ClockInResponse(
                workLog.getId(),
                member.getId(),
                member.getUsername(),
                workLog.getWorkDate(),
                workLog.getClockInTime()
        );
    }

    /**
     * 업무 종료 (퇴근)
     * 1. 당일 출근 기록 조회
     * 2. clockOutTime 업데이트
     * 3. MemberStatus → OFFLINE
     * 4. 트랜잭션 커밋 후 팀 전체에 WebSocket 브로드캐스트
     */
    @Transactional
    public ClockOutResponse clockOut(Member member) {
        LocalDate today = LocalDate.now();

        WorkLog workLog = workLogRepository.findByMemberAndWorkDate(member, today)
                .orElseThrow(() -> new IllegalStateException("오늘 출근 기록이 없습니다."));

        if (workLog.isClockedOut()) {
            throw new IllegalStateException("이미 퇴근 처리가 완료되었습니다.");
        }

        workLog.clockOut(LocalDateTime.now());

        // MemberStatus → OFFLINE
        updateMemberStatus(member, StatusType.OFFLINE);

        log.info("Clock-out: memberId={}, time={}", member.getId(), workLog.getClockOutTime());

        // 커밋 후 팀 전체 브로드캐스트
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

    /** MemberStatus upsert (없으면 생성, 있으면 업데이트) */
    private void updateMemberStatus(Member member, StatusType statusType) {
        // @AuthenticationPrincipal 객체는 영속성 컨텍스트 밖이므로 DB에서 재조회
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

    /**
     * 트랜잭션 커밋 완료 후 WebSocket 브로드캐스트
     * - /topic/team/{managerId} 로 전송
     * - managerId가 없는 경우(팀 미소속) 개인 토픽으로 폴백
     */
    private void broadcastAfterCommit(Member member, StatusType statusType) {
        TeamStatusBroadcast payload = new TeamStatusBroadcast(
                member.getId(),
                member.getUsername(),
                statusType,
                LocalDateTime.now()
        );

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                String topic = member.getManagerId() != null
                        ? "/topic/team/" + member.getManagerId()
                        : "/topic/members/" + member.getId();

                messagingTemplate.convertAndSend(topic, payload);
                log.info("Broadcasted status: memberId={}, status={}, topic={}",
                        member.getId(), statusType, topic);
            }
        });
    }
}
