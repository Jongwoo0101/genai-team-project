package com.worksight.api.dto;

import com.worksight.api.enums.Role;

public class TeamDto {

    // GET /api/teams/my-team 응답 (직원용)
    public record MyTeamResponse(
            Long teamId,
            String teamName,
            Long managerId,
            String managerUsername
    ) {}

    // GET /api/teams/{teamId}/members 응답 (관리자/직원용)
    public record TeamMemberResponse(
            Long id,
            String username,
            Role role,
            Long virtualBalance
    ) {}
}