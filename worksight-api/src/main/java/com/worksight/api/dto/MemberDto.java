package com.worksight.api.dto;

import com.worksight.api.entity.Role;

public class MemberDto {
    public record SignUpRequest(String username, String password, Role role) {}
    public record LoginRequest(String username, String password) {}
    public record MemberResponse(Long id, String username, Role role, Long balance) {}
}