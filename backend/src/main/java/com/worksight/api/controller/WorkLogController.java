package com.worksight.api.controller;

import com.worksight.api.dto.WorkLogDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.service.WorkLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/work")
@RequiredArgsConstructor
public class WorkLogController {

    private final WorkLogService workLogService;

    /**
     * POST /api/work/clock-in
     * 업무 시작 — 팀 전체에 온라인 상태 브로드캐스트
     */
    @PostMapping("/clock-in")
    public ResponseEntity<ClockInResponse> clockIn(
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(workLogService.clockIn(member));
    }

    /**
     * POST /api/work/clock-out
     * 업무 종료 — 팀 전체에 오프라인 상태 브로드캐스트
     */
    @PostMapping("/clock-out")
    public ResponseEntity<ClockOutResponse> clockOut(
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(workLogService.clockOut(member));
    }
}
