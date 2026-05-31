package com.worksight.api.service;

import com.worksight.api.dto.TeamDto.*;
import com.worksight.api.entity.InviteCode;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.Team;
import com.worksight.api.enums.Role;
import com.worksight.api.exception.ResourceNotFoundException;
import com.worksight.api.exception.UnauthorizedAccessException;
import com.worksight.api.repository.InviteCodeRepository;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final MemberRepository memberRepository;
    private final TeamRepository teamRepository;
    private final InviteCodeRepository inviteCodeRepository; // 초대 코드 생성을 위해 추가됨

    /**
     * [신규] POST /api/teams
     * 팀 생성 및 초대 코드 발급
     */
    @Transactional
    public CreateTeamResponse createTeam(CreateTeamRequest request, Member manager) {
        Member currentManager = memberRepository.findById(manager.getId())
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다."));

        // 1. 새로운 팀 생성
        Team newTeam = Team.builder()
                .teamName(request.teamName())
                .manager(currentManager)
                .build();
        Team savedTeam = teamRepository.save(newTeam);

        // 2. 초대 코드 생성 (예: WS-ABCD-1234)
        String uniqueCode = "WS-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        Instant expiresAt = Instant.now().plusSeconds(86400); // 24시간 유효

        InviteCode inviteCode = InviteCode.builder()
                .code(uniqueCode)
                .team(savedTeam)
                .expiresAt(expiresAt)
                .build();
        inviteCodeRepository.save(inviteCode);

        return new CreateTeamResponse(
                savedTeam.getId(),
                savedTeam.getTeamName(),
                inviteCode.getCode()
        );
    }

    /**
     * [신규] GET /api/teams/my-teams
     * 관리자가 소유한 팀 목록 및 멤버 수 반환
     */
    @Transactional(readOnly = true)
    public List<MyTeamsResponse> getMyTeams(Member manager) {
        // 관리자가 소유한 모든 팀 조회 (TeamRepository에 findAllByManagerId 추가 필요)
        List<Team> teams = teamRepository.findAllByManagerId(manager.getId());

        return teams.stream().map(team -> {
            // 해당 팀에 소속된 직원 수 계산
            int memberCount = memberRepository.findAllByTeamId(team.getId()).size();

            // Team 엔티티에 createdAt 필드가 없다면 빈 문자열("") 또는 null로 처리
            String createdAt = "";

            return new MyTeamsResponse(
                    team.getId(),
                    team.getTeamName(),
                    manager.getId(),
                    manager.getUsername(),
                    memberCount,
                    createdAt
            );
        }).toList();
    }

    /**
     * GET /api/teams/my-team
     * 직원이 자신이 소속된 팀(관리자 정보) 조회
     */
    @Transactional(readOnly = true)
    public MyTeamResponse getMyTeam(Member employee) {
        Member currentEmployee = memberRepository.findById(employee.getId())
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다."));

        if (currentEmployee.getTeam() == null) {
            throw new IllegalStateException("아직 팀에 소속되지 않았습니다.");
        }

        Team team = currentEmployee.getTeam();
        Member manager = team.getManager();

        return new MyTeamResponse(
                team.getId(),
                team.getTeamName(),
                manager.getId(),
                manager.getUsername()
        );
    }

    /**
     * GET /api/teams/{teamId}/members
     * 팀 소속 직원 목록 조회
     */
    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getTeamMembers(Long teamId, Member member) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 팀입니다."));

        if (member.getRole() == Role.MANAGER) {
            if (!team.getManager().getId().equals(member.getId())) {
                throw new IllegalArgumentException("본인이 관리하는 팀의 멤버만 조회할 수 있습니다.");
            }
        } else if (member.getRole() == Role.EMPLOYEE) {
            Member currentEmployee = memberRepository.findById(member.getId()).orElseThrow();
            if (currentEmployee.getTeam() == null || !currentEmployee.getTeam().getId().equals(teamId)) {
                throw new IllegalArgumentException("본인 소속 팀의 멤버만 조회할 수 있습니다.");
            }
        }

        return memberRepository.findAllByTeamId(teamId)
                .stream()
                .map(m -> new TeamMemberResponse(
                        m.getId(),
                        m.getUsername(),
                        m.getRole(),
                        m.getVirtualBalance()
                ))
                .toList();
    }

    /**
     * DELETE /api/teams/{teamId}
     * 팀 삭제 로직
     */
    @Transactional
    public void deleteTeam(Long teamId, Member manager) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> ResourceNotFoundException.team(teamId));

        if (!team.getManager().getId().equals(manager.getId())) {
            throw UnauthorizedAccessException.myTeamOnly();
        }

        // 팀원들의 team 연결 해제
        memberRepository.findAllByTeamId(teamId)
                .forEach(m -> m.joinTeam(null));

        teamRepository.delete(team);
    }
}