package com.worksight.api.dto;

import com.worksight.api.entity.Role;

public class MemberDto {
    public record SignUpRequest(String username, String password, Role role) {}
    public record LoginRequest(String username, String password) {}
    public record ReissueRequest(String refreshToken) {}
    public record MemberResponse(Long id, String username, Role role, Long balance) {}
    public record LoginResponse(
            String token,
            String refreshToken,
            Long id,
            String username,
            Role role,
            Long virtualBalance
    ) {}
    public record InviteCodeResponse(String inviteCode) {}
    public record JoinTeamRequest(String inviteCode) {}
}