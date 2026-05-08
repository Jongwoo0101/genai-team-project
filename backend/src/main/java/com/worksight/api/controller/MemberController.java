package com.worksight.api.controller;

import com.worksight.api.dto.MemberDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @PostMapping("/signup")
    public ResponseEntity<MemberResponse> signUp(@RequestBody SignUpRequest request) {
        return ResponseEntity.ok(memberService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(memberService.login(request));
    }

    @PostMapping("/reissue")
    public ResponseEntity<LoginResponse> reissue(@RequestBody ReissueRequest request) {
        return ResponseEntity.ok(memberService.reissue(request));
    }

    // MANAGER가 초대 코드 생성
    @PostMapping("/invite-code")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<InviteCodeResponse> generateInviteCode(
            @AuthenticationPrincipal Member manager
    ) {
        return ResponseEntity.ok(memberService.generateInviteCode(manager));
    }

    // EMPLOYEE가 초대 코드로 팀 참가
    @PostMapping("/join-team")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<Void> joinTeam(
            @RequestBody JoinTeamRequest request,
            @AuthenticationPrincipal Member employee
    ) {
        memberService.joinTeam(request, employee);
        return ResponseEntity.ok().build();
    }
}