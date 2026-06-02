package com.worksight.api.controller;

import com.worksight.api.dto.MemberStatusDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.service.StatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/status")
@RequiredArgsConstructor
public class StatusController {

    private final StatusService statusService;

    /**
     * PUT /api/status/ai
     * AI 캠 분석 결과 상태 업데이트 (WORKING / MEETING / BREAK)
     */
    @PutMapping("/ai")
    public ResponseEntity<StatusUpdateResponse> updateAiStatus(
            @AuthenticationPrincipal Member member,
            @RequestBody AiStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(statusService.updateAiStatus(member, request));
    }

    /**
     * PUT /api/status/manual
     * 사용자 수동 상태 설정 (FOCUS 전용)
     */
    @PutMapping("/manual")
    public ResponseEntity<StatusUpdateResponse> updateManualStatus(
            @AuthenticationPrincipal Member member,
            @RequestBody ManualStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(statusService.updateManualStatus(member, request));
    }

    /**
     * GET /api/status/team/{teamId}
     * 팀 전체 현재 상태 조회 (MANAGER 전용)
     */
    @GetMapping("/team/{teamId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<TeamMemberStatusResponse>> getTeamStatus(
            @PathVariable Long teamId,
            @AuthenticationPrincipal Member manager
    ) {
        return ResponseEntity.ok(statusService.getTeamStatus(teamId, manager));
    }
}
