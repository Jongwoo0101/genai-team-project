package com.worksight.api.service;

import com.worksight.api.dto.MemberDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.InviteCode;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.RefreshToken;
import com.worksight.api.entity.Team;
import com.worksight.api.exception.DuplicateUsernameException;
import com.worksight.api.exception.ResourceNotFoundException;
import com.worksight.api.repository.InviteCodeRepository;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.TeamRepository;
import com.worksight.api.security.JwtProvider;
import com.worksight.api.security.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;
    private final SimpMessagingTemplate messagingTemplate;
    private final InviteCodeRepository inviteCodeRepository;
    private final ChatService chatService;

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
        Member saved = memberRepository.save(member);
        return new MemberResponse(saved.getId(), saved.getUsername(),
                saved.getRole(), saved.getVirtualBalance());
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        // 아이디/비밀번호 오류 메시지 통일 — 사용자 열거(User Enumeration) 공격 방지
        // 기존: 아이디 없음 / 비밀번호 틀림을 각각 다른 메시지로 노출
        // 개선: 두 경우 모두 동일한 메시지 반환
        Member member = memberRepository.findByUsername(request.username())
                .orElseThrow(() ->
                        new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        String accessToken  = jwtProvider.generateAccessToken(member);
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
                .orElseThrow(() -> ResourceNotFoundException.member(refreshToken.getMemberId()));

        String newAccessToken  = jwtProvider.generateAccessToken(member);
        String newRefreshToken = jwtProvider.generateRefreshToken(member);
        refreshTokenService.save(member.getId(), newRefreshToken);

        return new LoginResponse(newAccessToken, newRefreshToken,
                member.getId(), member.getUsername(),
                member.getRole(), member.getVirtualBalance());
    }

    @Transactional
    public InviteCodeResponse generateInviteCode(Member manager, CreateTeamRequest request) {
        String teamName = (request != null
                && request.teamName() != null
                && !request.teamName().isBlank())
                ? request.teamName().trim()
                : manager.getUsername() + " 님의 팀";

        // 관리자의 팀이 없으면 자동 생성 (초대 코드 발급 시점에 팀을 함께 만들어주는 편의 처리)
        Team team = teamRepository.findFirstByManagerIdOrderByIdDesc(manager.getId())
                .orElseGet(() -> teamRepository.save(
                        Team.builder().teamName(teamName).manager(manager).build()
                ));

        String code = "WS-" + randomSegment() + "-" + randomSegment();
        Instant expiresAt = Instant.now().plusSeconds(inviteExpirationSeconds);

        inviteCodeRepository.save(
                InviteCode.builder()
                        .code(code)
                        .team(team)
                        .expiresAt(expiresAt)
                        .build()
        );

        return new InviteCodeResponse(code, team.getId());
    }

    @Transactional
    public void joinTeam(JoinTeamRequest request, Member employee) {
        InviteCode inviteCode = inviteCodeRepository.findByCode(request.inviteCode())
                .orElseThrow(() ->
                        new IllegalArgumentException("유효하지 않거나 만료된 초대 코드입니다."));

        // InviteCode 엔티티의 isExpired() 편의 메서드 활용
        if (inviteCode.isExpired()) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 초대 코드입니다.");
        }

        Member managedEmployee = memberRepository.findById(employee.getId())
                .orElseThrow(() -> ResourceNotFoundException.member(employee.getId()));

        Team targetTeam = inviteCode.getTeam();
        managedEmployee.joinTeam(targetTeam);

        chatService.addParticipantToTeamRoom(targetTeam.getId(), managedEmployee);

        // 트랜잭션 내 직접 전송 → afterCommit()으로 변경
        // 기존: messagingTemplate.convertAndSend(...) — 롤백 시에도 메시지가 전송되는 버그
        // 개선: DB 커밋 성공 후에만 WebSocket 메시지 전송 보장
        final Long employeeId = managedEmployee.getId();
        final Long teamId     = targetTeam.getId();
        final String teamName2 = targetTeam.getTeamName();
        final Long managerId  = targetTeam.getManager().getId();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend(
                        "/topic/members/" + employeeId,
                        WsEnvelope.of(WsEnvelope.Event.TEAM_LINKED, Map.of(
                                "teamId",    teamId,
                                "teamName",  teamName2,
                                "managerId", managerId
                        ))
                );
            }
        });
    }

    private String randomSegment() {
        return UUID.randomUUID().toString()
                .replace("-", "").substring(0, 4).toUpperCase();
    }
}
