package com.worksight.api.service;

import com.worksight.api.dto.MemberDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.RefreshToken;
import com.worksight.api.exception.DuplicateUsernameException;
import com.worksight.api.repository.InviteCodeRepository;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.security.JwtProvider;
import com.worksight.api.security.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;
    private final SimpMessagingTemplate messagingTemplate;
    private final InviteCodeRepository inviteCodeRepository;
    private final ChatService chatService;

    /** 설정 외부화 — application.yaml의 app.invite.expiration-seconds */
    @Value("${app.invite.expiration-seconds:300}")
    private long inviteExpirationSeconds;

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
                .orElseThrow(() -> new IllegalArgumentException(
                        "존재하지 않는 아이디입니다. 아이디를 다시 확인해주세요."));
        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 올바르지 않습니다. 다시 확인해주세요.");
        }
        String accessToken = jwtProvider.generateAccessToken(member);
        String refreshToken = jwtProvider.generateRefreshToken(member);
        refreshTokenService.save(member.getId(), refreshToken);
        return new LoginResponse(accessToken, refreshToken,
                member.getId(), member.getUsername(),
                member.getRole(), member.getVirtualBalance());
    }

    @Transactional
    public LoginResponse reissue(ReissueRequest request) {
        String oldToken = request.refreshToken();
        if (!jwtProvider.isValid(oldToken)) {
            throw new IllegalArgumentException("유효하지 않은 refresh token입니다.");
        }
        RefreshToken refreshToken = refreshTokenService.validate(oldToken);
        Member member = memberRepository.findById(refreshToken.getMemberId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        String newAccessToken = jwtProvider.generateAccessToken(member);
        String newRefreshToken = jwtProvider.generateRefreshToken(member);
        refreshTokenService.save(member.getId(), newRefreshToken);
        return new LoginResponse(newAccessToken, newRefreshToken,
                member.getId(), member.getUsername(),
                member.getRole(), member.getVirtualBalance());
    }

    @Transactional
    public InviteCodeResponse generateInviteCode(Member manager) {
        String code = "WS-" + randomSegment() + "-" + randomSegment();
        Instant expiresAt = Instant.now().plusSeconds(inviteExpirationSeconds);

        com.worksight.api.entity.InviteCode inviteCode =
                com.worksight.api.entity.InviteCode.builder()
                        .code(code)
                        .managerId(manager.getId())
                        .expiresAt(expiresAt)
                        .build();
        inviteCodeRepository.save(inviteCode);

        return new InviteCodeResponse(code);
    }

    /**
     * EMPLOYEE 초대 코드로 팀 참가
     * 다회용 사용을 위해 DB 코드 조회 후 시간만 검증하도록 수정
     */
    @Transactional
    public void joinTeam(JoinTeamRequest request, Member employee) {
        // 1. 조회 메서드 변경: findByCode
        com.worksight.api.entity.InviteCode inviteCode =
                inviteCodeRepository.findByCode(request.inviteCode())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "유효하지 않거나 만료된 초대 코드입니다."));

        if (Instant.now().isAfter(inviteCode.getExpiresAt())) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 초대 코드입니다.");
        }

        Member managedEmployee = memberRepository.findById(employee.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 직원입니다."));

        managedEmployee.linkManager(inviteCode.getManagerId());

        // 팀 채팅방에 새로운 팀원 참여 처리
        chatService.addParticipantToTeamRoom(inviteCode.getManagerId(), managedEmployee);

        // 2. 일회성 처리 제거됨: inviteCode.markAsUsed();

        messagingTemplate.convertAndSend(
                "/topic/members/" + managedEmployee.getId(),
                WsEnvelope.of(
                        WsEnvelope.Event.TEAM_LINKED,
                        Map.of("managerId", inviteCode.getManagerId())
                )
        );
    }

    private String randomSegment() {
        return UUID.randomUUID().toString()
                .replace("-", "").substring(0, 4).toUpperCase();
    }
}