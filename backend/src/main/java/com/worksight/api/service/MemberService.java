package com.worksight.api.service;

import com.worksight.api.dto.MemberDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.RefreshToken;
import com.worksight.api.exception.DuplicateUsernameException;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.security.JwtProvider;
import com.worksight.api.security.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;
    private final SimpMessagingTemplate messagingTemplate;

    // code -> managerId

    private final ConcurrentHashMap<String, InviteEntry> inviteStore =
            new ConcurrentHashMap<>();

    private record InviteEntry(
            Long managerId,
            Instant expiresAt
    ) {}

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

    @Transactional
    public LoginResponse login(LoginRequest request) {

        Member member = memberRepository.findByUsername(request.username())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "존재하지 않는 아이디입니다. 아이디를 다시 확인해주세요."
                        )
                );

        if (!passwordEncoder.matches(
                request.password(),
                member.getPassword()
        )) {
            throw new IllegalArgumentException(
                    "비밀번호가 올바르지 않습니다. 다시 확인해주세요."
            );
        }

        String accessToken =
                jwtProvider.generateAccessToken(member);

        String refreshToken =
                jwtProvider.generateRefreshToken(member);

        refreshTokenService.save(
                member.getId(),
                refreshToken
        );

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

        if (!jwtProvider.isValid(oldToken)) {
            throw new IllegalArgumentException(
                    "유효하지 않은 refresh token입니다."
            );
        }

        RefreshToken refreshToken =
                refreshTokenService.validate(oldToken);

        Member member = memberRepository.findById(
                        refreshToken.getMemberId()
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "존재하지 않는 회원입니다."
                        )
                );

        String newAccessToken =
                jwtProvider.generateAccessToken(member);

        String newRefreshToken =
                jwtProvider.generateRefreshToken(member);

        refreshTokenService.save(
                member.getId(),
                newRefreshToken
        );

        return new LoginResponse(
                newAccessToken,
                newRefreshToken,
                member.getId(),
                member.getUsername(),
                member.getRole(),
                member.getVirtualBalance()
        );
    }

    /**
     * MANAGER가 초대 코드 생성
     */
    public InviteCodeResponse generateInviteCode(Member manager) {

        String code =
                "WS-" + randomSegment() + "-" + randomSegment();

        Instant expiresAt =
                Instant.now().plusSeconds(300);

        inviteStore.put(
                code,
                new InviteEntry(manager.getId(), expiresAt)
        );

        return new InviteCodeResponse(code);
    }

    // EMPLOYEE가 코드 입력 후 팀 참가
    @Transactional
    public void joinTeam(
            JoinTeamRequest request,
            Member employee
    ) {

        String code = request.inviteCode();

        InviteEntry entry = inviteStore.get(code);

        if (entry == null) {
            throw new IllegalArgumentException(
                    "유효하지 않거나 만료된 초대 코드입니다."
            );
        }

        if (Instant.now().isAfter(entry.expiresAt())) {

            inviteStore.remove(code);

            throw new IllegalArgumentException(
                    "유효하지 않거나 만료된 초대 코드입니다."
            );
        }

        employee.linkManager(entry.managerId());
        memberRepository.save(employee);  // DB에 팀 매핑 저장

        inviteStore.remove(code);

        messagingTemplate.convertAndSend(
                "/topic/members/" + employee.getId(),
                Map.of(
                        "type", "TEAM_LINKED",
                        "managerId", entry.managerId()
                )
        );
    }

    private String randomSegment() {

        return UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 4)
                .toUpperCase();
    }
}