package com.worksight.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class DailyStandupDto {

    /** 목표 작성/수정 요청 (하루 시작) */
    public record WriteGoalRequest(
            String goal
    ) {}

    /** 결과 작성/수정 요청 (하루 끝) */
    public record WriteResultRequest(
            String result
    ) {}

    /** 스탠드업 응답 */
    public record DailyStandupResponse(
            Long standupId,
            Long memberId,
            String username,
            LocalDate standupDate,
            String goal,
            String result,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    /** 팀 전체 스탠드업 조회 응답 */
    public record TeamStandupResponse(
            LocalDate standupDate,
            java.util.List<DailyStandupResponse> standups
    ) {}
}
