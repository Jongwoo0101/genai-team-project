package com.worksight.api.service;

import com.worksight.api.dto.MemberDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.RefreshToken;
import com.worksight.api.exception.DuplicateUsernameException;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.security.JwtProvider;
import com.worksight.api.security.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public MemberResponse register(SignUpRequest request) {
        if (memberRepository.existsByUsername(request.username())) {
            throw new DuplicateUsernameException(request.username());
        }

        Member member = Member.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .build();

        Member savedMember = memberRepository.save(member);
        return new MemberResponse(
                savedMember.getId(),
                savedMember.getUsername(),
                savedMember.getRole(),
                savedMember.getVirtualBalance()
        );
    }

    @Transactional  // readOnly 제거 — refresh token DB 저장이 필요하므로
    public LoginResponse login(LoginRequest request) {
        Member member = memberRepository.findByUsername(request.username())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이디입니다. 아이디를 다시 확인해주세요."));

        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 올바르지 않습니다. 다시 확인해주세요.");
        }

        String accessToken = jwtProvider.generateAccessToken(member);
        String refreshToken = jwtProvider.generateRefreshToken(member);

        refreshTokenService.save(member.getId(), refreshToken);

        return new LoginResponse(
                accessToken,
                refreshToken,
                member.getId(),
                member.getUsername(),
                member.getRole(),
                member.getVirtualBalance()
        );
    }

    @Transactional
    public LoginResponse reissue(ReissueRequest request) {
        String oldToken = request.refreshToken();

        // 1. JWT 서명/만료 검증
        if (!jwtProvider.isValid(oldToken)) {
            throw new IllegalArgumentException("유효하지 않은 refresh token입니다.");
        }

        // 2. DB 존재 여부 + 만료 검증
        RefreshToken refreshToken = refreshTokenService.validate(oldToken);

        // 3. 멤버 조회
        Member member = memberRepository.findById(refreshToken.getMemberId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 4. 새 토큰 발급 + rotate
        String newAccessToken = jwtProvider.generateAccessToken(member);
        String newRefreshToken = jwtProvider.generateRefreshToken(member);
        refreshTokenService.save(member.getId(), newRefreshToken);

        return new LoginResponse(
                newAccessToken,
                newRefreshToken,
                member.getId(),
                member.getUsername(),
                member.getRole(),
                member.getVirtualBalance()
        );
    }
}