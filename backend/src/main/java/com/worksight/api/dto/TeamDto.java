package com.worksight.api.dto;

import com.worksight.api.enums.Role;

import java.util.List;

public class TeamDto {

    // GET /api/teams/my-team 응답 (직원용)
    public record MyTeamResponse(
            Long teamId,
            String teamName,
            Long managerId,
            String managerUsername
    ) {}

    // GET /api/teams/{teamId}/members 응답
    public record TeamMemberResponse(
            Long id,
            String username,
            Role role,
            Long virtualBalance
    ) {}

    /**
     * [신규] GET /api/teams/my-teams 응답 (관리자용 팀 목록)
     * 관리자가 소유한 팀 목록 + 각 팀의 멤버 수를 반환
     * 프론트의 localStorage 의존을 서버 데이터로 대체하기 위한 용도
     */
    public record MyTeamsResponse(
            Long teamId,
            String teamName,
            Long managerId,
            String managerUsername,
            int memberCount,
            String createdAt
    ) {}

    /**
     * [신규] POST /api/teams 요청 (팀 직접 생성)
     * 기존에는 invite-code 발급 시 팀이 자동 생성됐지만,
     * "새 팀 만들기" UI가 명시적으로 팀을 생성하는 흐름이므로 별도 분리
     */
    public record CreateTeamRequest(
            String teamName,
            String description     // 현재 백엔드 Team 엔티티에 description 필드는 없으나
            // 프론트가 보내므로 수신은 가능하게 선언 (무시해도 됨)
    ) {}

    /**
     * [신규] POST /api/teams 응답
     * 팀 생성 후 바로 초대 코드까지 발급해서 반환
     * 프론트의 createTeamAndInviteCode 한 번 호출로 처리 가능
     */
    public record CreateTeamResponse(
            Long teamId,
            String teamName,
            String inviteCode
    ) {}
}