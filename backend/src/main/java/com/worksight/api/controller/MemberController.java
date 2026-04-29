package com.worksight.api.controller;

import com.worksight.api.dto.MemberDto.*;
import com.worksight.api.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<MemberResponse> login(@RequestBody LoginRequest request) {
        // 실제 구현에서는 JWT 토큰 반환
        return ResponseEntity.ok(memberService.login(request));
    }
}