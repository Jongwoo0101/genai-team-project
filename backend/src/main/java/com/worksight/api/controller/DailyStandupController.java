package com.worksight.api.controller;

import com.worksight.api.dto.DailyStandupDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.service.DailyStandupService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/standup")
@RequiredArgsConstructor
public class DailyStandupController {

    private final DailyStandupService dailyStandupService;

    /**
     * POST /api/standup/goal
     * 오늘의 목표 작성 (하루 시작)
     */
    @PostMapping("/goal")
    public ResponseEntity<DailyStandupResponse> writeGoal(
            @AuthenticationPrincipal Member member,
            @RequestBody WriteGoalRequest request
    ) {
        return ResponseEntity.ok(dailyStandupService.writeGoal(member, request));
    }

    /**
     * POST /api/standup/result
     * 오늘의 결과 작성 (하루 끝)
     */
    @PostMapping("/result")
    public ResponseEntity<DailyStandupResponse> writeResult(
            @AuthenticationPrincipal Member member,
            @RequestBody WriteResultRequest request
    ) {
        return ResponseEntity.ok(dailyStandupService.writeResult(member, request));
    }

    /**
     * GET /api/standup/my
     * 내 오늘 스탠드업 조회
     */
    @GetMapping("/my")
    public ResponseEntity<DailyStandupResponse> getMyStandup(
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(dailyStandupService.getMyStandup(member));
    }

    /**
     * GET /api/standup/team?date=2026-05-20
     * 팀 전체 스탠드업 조회
     * date 파라미터 없으면 오늘 기준
     */
    @GetMapping("/team")
    public ResponseEntity<TeamStandupResponse> getTeamStandup(
            @AuthenticationPrincipal Member member,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long teamId
    ) {
        return ResponseEntity.ok(dailyStandupService.getTeamStandup(member, date, teamId));
    }
}
