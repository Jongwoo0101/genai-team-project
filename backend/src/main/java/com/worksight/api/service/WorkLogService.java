package com.worksight.api.service;

import com.worksight.api.dto.WorkLogDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.WorkLog;
import com.worksight.api.enums.StatusType;
import com.worksight.api.exception.AlreadyClockedInException;
import com.worksight.api.repository.WorkLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkLogService {

    private final WorkLogRepository workLogRepository;
    private final StatusService statusService;

    // MemberStatusRepository, MemberRepository, SimpMessagingTemplate 직접 의존 제거
    // 상태 업데이트 + WebSocket 브로드캐스트는 StatusService에 위임 → 로직 중복 제거

    @Transactional
    public ClockInResponse clockIn(Member member) {
        LocalDate today = LocalDate.now();

        // 중복 출근 체크
        // DB 유니크 제약(work_log: member_id + work_date)과 함께 이중 방어
        // 동시 요청 시 DataIntegrityViolationException → GlobalExceptionHandler 409 처리
        if (workLogRepository.findByMemberAndWorkDate(member, today).isPresent()) {
            throw new AlreadyClockedInException();
        }

        WorkLog workLog = WorkLog.builder()
                .member(member)
                .workDate(today)
                .clockInTime(LocalDateTime.now())
                .build();
        workLogRepository.save(workLog);

        // 상태 변경 + WebSocket 브로드캐스트를 StatusService에 위임
        // (기존 WorkLogService.updateMemberStatus() + broadcastAfterCommit() 삭제)
        statusService.updateStatusInternal(member, StatusType.WORKING);

        log.info("Clock-in: memberId={}, time={}", member.getId(), workLog.getClockInTime());

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

        //  상태 변경 + WebSocket 브로드캐스트를 StatusService에 위임
        statusService.updateStatusInternal(member, StatusType.OFFLINE);

        log.info("Clock-out: memberId={}, time={}", member.getId(), workLog.getClockOutTime());

        return new ClockOutResponse(
                workLog.getId(),
                member.getId(),
                member.getUsername(),
                workLog.getWorkDate(),
                workLog.getClockInTime(),
                workLog.getClockOutTime()
        );
    }
}
