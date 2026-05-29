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

    // GET /api/teams/my-team
    // 직원이 자신의 소속 팀 정보 및 관리자 정보 조회
    @GetMapping("/my-team")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<MyTeamResponse> getMyTeam(
            @AuthenticationPrincipal Member employee) {
        return ResponseEntity.ok(teamService.getMyTeam(employee));
    }

    // GET /api/teams/{teamId}/members
    // 특정 팀 소속 직원 목록 조회 (관리자 권한 확인 및 해당 팀 소속 직원 조회)
    @GetMapping("/{teamId}/members")
    @PreAuthorize("hasRole('MANAGER') or hasRole('EMPLOYEE')")
    public ResponseEntity<List<TeamMemberResponse>> getTeamMembers(
            @PathVariable Long teamId,
            @AuthenticationPrincipal Member member) {
        return ResponseEntity.ok(teamService.getTeamMembers(teamId, member));
    }
}