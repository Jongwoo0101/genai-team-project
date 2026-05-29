package com.worksight.api.service;

import com.worksight.api.dto.MemberDto.*;
import com.worksight.api.dto.WsEnvelope;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.RefreshToken;
import com.worksight.api.entity.Team;
import com.worksight.api.exception.DuplicateUsernameException;
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

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final TeamRepository teamRepository; // 추가됨: 팀 조회를 위해 필요
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
    public InviteCodeResponse generateInviteCode(Member manager, CreateTeamRequest request) {
        String customName = (request != null && request.teamName() != null && !request.teamName().trim().isEmpty())
                ? request.teamName().trim()
                : manager.getUsername() + " 님의 팀";

        // 1. 관리자의 팀을 찾거나, 없다면 새로 하나 생성해 줍니다.
        Team team = teamRepository.findFirstByManagerIdOrderByIdDesc(manager.getId())
                .orElseGet(() -> {
                    Team newTeam = Team.builder()
                            .teamName(customName)
                            .manager(manager)
                            .build();
                    return teamRepository.save(newTeam);
                });

        String code = "WS-" + randomSegment() + "-" + randomSegment();
        Instant expiresAt = Instant.now().plusSeconds(inviteExpirationSeconds);

        // 2. 초대 코드 생성 시 managerId가 아닌 team 객체를 매핑
        com.worksight.api.entity.InviteCode inviteCode =
                com.worksight.api.entity.InviteCode.builder()
                        .code(code)
                        .team(team)
                        .expiresAt(expiresAt)
                        .build();
        inviteCodeRepository.save(inviteCode);

        return new InviteCodeResponse(code, team.getId());
    }

    @Transactional
    public void joinTeam(JoinTeamRequest request, Member employee) {
        // 1. 코드 조회
        com.worksight.api.entity.InviteCode inviteCode =
                inviteCodeRepository.findByCode(request.inviteCode())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "유효하지 않거나 만료된 초대 코드입니다."));

        // 2. 만료 시간 검증 (우리가 엔티티에 만들어둔 편의 메서드 isExpired() 활용)
        if (inviteCode.isExpired()) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 초대 코드입니다.");
        }

        Member managedEmployee = memberRepository.findById(employee.getId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 직원입니다."));

        // 3. 초대 코드에 매핑된 '팀' 정보를 가져옴
        Team targetTeam = inviteCode.getTeam();

        // 4. 직원 엔티티를 해당 팀에 조인 (기존의 linkManager 대체)
        managedEmployee.joinTeam(targetTeam);

        // 5. 팀 채팅방에 새로운 팀원 참여 처리
        // 주의: ChatService가 기존에 managerId를 파라미터로 받았다면, 이제 team.getId()를 받도록 의미가 변경됨!
        chatService.addParticipantToTeamRoom(targetTeam.getId(), managedEmployee);

        // 6. 웹소켓으로 프론트에 성공 알림
        messagingTemplate.convertAndSend(
                "/topic/members/" + managedEmployee.getId(),
                WsEnvelope.of(
                        WsEnvelope.Event.TEAM_LINKED,
                        Map.of(
                                "teamId", targetTeam.getId(),
                                "teamName", targetTeam.getTeamName(),
                                "managerId", targetTeam.getManager().getId()
                        )
                )
        );
    }

    private String randomSegment() {
        return UUID.randomUUID().toString()
                .replace("-", "").substring(0, 4).toUpperCase();
    }
}