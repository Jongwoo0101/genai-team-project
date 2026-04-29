package com.worksight.api.service;


import com.worksight.api.dto.MemberDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public MemberResponse register(SignUpRequest request) {
        Member member = Member.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .build();
        Member savedMember = memberRepository.save(member);
        return new MemberResponse(savedMember.getId(), savedMember.getUsername(), savedMember.getRole(), savedMember.getVirtualBalance());
    }

    @Transactional(readOnly = true)
    public MemberResponse login(LoginRequest request) {
        Member member = memberRepository.findByUsername(request.username())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }
        return new MemberResponse(member.getId(), member.getUsername(), member.getRole(), member.getVirtualBalance());
    }
}