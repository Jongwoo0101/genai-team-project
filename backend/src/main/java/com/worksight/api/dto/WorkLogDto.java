package com.worksight.api.dto;

import com.worksight.api.enums.StatusType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class WorkLogDto {

    /** 출근 응답 */
    public record ClockInResponse(
            Long workLogId,
            Long memberId,
            String username,
            LocalDate workDate,
            LocalDateTime clockInTime
    ) {}

    /** 퇴근 응답 */
    public record ClockOutResponse(
            Long workLogId,
            Long memberId,
            String username,
            LocalDate workDate,
            LocalDateTime clockInTime,
            LocalDateTime clockOutTime
    ) {}

    /** WebSocket 브로드캐스트용 — 팀 전체에 전송 */
    public record TeamStatusBroadcast(
            Long memberId,
            String username,
            StatusType statusType,  // WORKING or OFFLINE
            LocalDateTime changedAt
    ) {}
}
