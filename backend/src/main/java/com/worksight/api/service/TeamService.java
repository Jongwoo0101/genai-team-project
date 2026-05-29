package com.worksight.api.service;

import com.worksight.api.dto.TeamDto.*;
import com.worksight.api.entity.Member;
import com.worksight.api.entity.Team;
import com.worksight.api.enums.Role;
import com.worksight.api.repository.MemberRepository;
import com.worksight.api.repository.TeamRepository; // 필요 시 추가생성 가정
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final MemberRepository memberRepository;
    // 만약 TeamRepository가 없다면 JpaRepository<Team, Long>으로 하나 생성해줘야 해.
    private final TeamRepository teamRepository;

    /**
     * GET /api/teams/my-team
     * 직원이 자신이 소속된 팀(관리자 정보) 조회
     */
    @Transactional(readOnly = true)
    public MyTeamResponse getMyTeam(Member employee) {
        // 영속성 컨텍스트 초기화를 위해 레포지토리에서 다시 조회 처리 권장
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

        // 권한 및 본인 팀 여부 검증
        if (member.getRole() == Role.MANAGER) {
            // 관리자가 요청한 경우: 이 팀의 담당 관리자가 본인이 맞는지 확인
            if (!team.getManager().getId().equals(member.getId())) {
                throw new IllegalArgumentException("본인이 관리하는 팀의 멤버만 조회할 수 있습니다.");
            }
        } else if (member.getRole() == Role.EMPLOYEE) {
            // 직원이 요청한 경우: 본인이 속한 팀이 맞는지 확인
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
}