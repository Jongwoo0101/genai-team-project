package com.worksight.api.controller;

import com.worksight.api.dto.TeamDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    // POST /api/teams — 현재 구조에서는 invite-code 플로우가 팀 생성을 대체하므로
    // 프론트 연동 시 필요하면 추가 구현 예정
    // (현재 managerId 기반 구조에서는 별도 팀 생성 API 불필요)

    // GET /api/teams/my-team
    // 직원이 자신의 소속 팀(관리자 정보) 조회
    @GetMapping("/my-team")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<MyTeamResponse> getMyTeam(
            @AuthenticationPrincipal Member employee) {
        return ResponseEntity.ok(teamService.getMyTeam(employee));
    }

    // GET /api/teams/{managerId}/members
    // 팀 소속 직원 목록 조회 (관리자 및 해당 팀 소속 직원)
    @GetMapping("/{managerId}/members")
    @PreAuthorize("hasRole('MANAGER') or hasRole('EMPLOYEE')")
    public ResponseEntity<List<TeamMemberResponse>> getTeamMembers(
            @PathVariable Long managerId,
            @AuthenticationPrincipal Member member) {
        return ResponseEntity.ok(teamService.getTeamMembers(managerId, member));
    }
}