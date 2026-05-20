package com.worksight.api.dto;

import com.worksight.api.enums.StatusType;

import java.time.LocalDateTime;

public class MemberStatusDto {

    /** AI 캠 분석 결과 수신 (프론트 → 백엔드) */
    public record AiStatusUpdateRequest(
            StatusType statusType   // WORKING / MEETING / BREAK
    ) {}

    /** 사용자 수동 상태 설정 (프론트 → 백엔드) */
    public record ManualStatusUpdateRequest(
            StatusType statusType   // FOCUS 만 허용 (서비스 레이어에서 검증)
    ) {}

    /** 상태 변경 응답 */
    public record StatusUpdateResponse(
            Long memberId,
            String username,
            StatusType statusType,
            LocalDateTime updatedAt
    ) {}

    /** 팀 전체 상태 조회 응답 (1인 1건) */
    public record TeamMemberStatusResponse(
            Long memberId,
            String username,
            StatusType statusType,
            LocalDateTime updatedAt
    ) {}
}
