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

    /**
     * [신규] POST /api/teams
     * 팀 생성 + 초대 코드 즉시 발급
     * 기존 흐름: POST /api/members/invite-code 호출 시 팀이 없으면 자동 생성
     * 개선 흐름: 프론트 "새 팀 만들기" 버튼 → 이 API 한 번만 호출
     * 응답: { teamId, teamName, inviteCode }
     * 프론트의 api.createTeamAndInviteCode()가 이 엔드포인트를 호출하면 됨
     */
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<CreateTeamResponse> createTeam(
            @RequestBody CreateTeamRequest request,
            @AuthenticationPrincipal Member manager
    ) {
        return ResponseEntity.ok(teamService.createTeam(request, manager));
    }

    /**
     * [신규] GET /api/teams/my-teams
     * 관리자 본인이 소유한 팀 목록 조회
     * 프론트 localStorage 의존 제거를 위해 페이지 로드 시 호출
     * → 서버 DB 기준으로 팀 목록을 내려줌
     */
    @GetMapping("/my-teams")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<MyTeamsResponse>> getMyTeams(
            @AuthenticationPrincipal Member manager
    ) {
        return ResponseEntity.ok(teamService.getMyTeams(manager));
    }

    /**
     * GET /api/teams/my-team
     * 직원이 자신의 소속 팀 정보 및 관리자 정보 조회
     */
    @GetMapping("/my-team")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<MyTeamResponse> getMyTeam(
            @AuthenticationPrincipal Member employee
    ) {
        return ResponseEntity.ok(teamService.getMyTeam(employee));
    }

    /**
     * GET /api/teams/{teamId}/members
     * 팀 소속 멤버 목록 조회 (관리자 + 소속 직원 모두 가능)
     */
    @GetMapping("/{teamId}/members")
    @PreAuthorize("hasRole('MANAGER') or hasRole('EMPLOYEE')")
    public ResponseEntity<List<TeamMemberResponse>> getTeamMembers(
            @PathVariable Long teamId,
            @AuthenticationPrincipal Member member
    ) {
        return ResponseEntity.ok(teamService.getTeamMembers(teamId, member));
    }

    /**
     * [신규] DELETE /api/teams/{teamId}
     * 팀 삭제 (관리자 본인만 가능)
     * 삭제 시:
     * 1. 팀 소속 직원들의 team 연결 해제 (member.team = null)
     * 2. 팀에 연결된 초대 코드 삭제
     * 3. team 레코드 삭제
     * 프론트 deleteTeam()이 localStorage 삭제 전에 이 API를 먼저 호출해야 함
     */
    @DeleteMapping("/{teamId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long teamId,
            @AuthenticationPrincipal Member manager
    ) {
        teamService.deleteTeam(teamId, manager);
        return ResponseEntity.ok().build();
    }
}