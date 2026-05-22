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

    /**
     * WebSocket 브로드캐스트용 상태 페이로드
     * WsEnvelope.data 에 담겨 전송됨
     * occurredAt 은 WsEnvelope 레벨에서 관리하므로 여기선 제거
     */
    public record TeamStatusPayload(
            Long memberId,
            String username,
            StatusType statusType
    ) {}
}